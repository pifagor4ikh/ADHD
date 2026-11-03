"""Mirror canonical development skills into supported project discovery paths.

No network, host configuration changes, symlinks or recursive deletion.
"""
import argparse
from pathlib import Path
import re
import sys


def source_files(root):
    source = root / "skills"
    manifests = sorted(source.glob("*/SKILL.md"))
    if not manifests:
        raise ValueError("No canonical skills found")
    for manifest in manifests:
        content = manifest.read_text(encoding="utf-8")
        header = re.match(r"\A---\r?\n(.*?)\r?\n---\r?\n", content, re.S)
        if not header:
            raise ValueError(f"Invalid frontmatter: {manifest}")
        fields = dict(re.findall(r"^(name|description):\s*(.+)$", header[1], re.M))
        if fields.get("name") != manifest.parent.name or not fields.get("description"):
            raise ValueError(f"Invalid name/description: {manifest}")
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", fields["name"]):
            raise ValueError(f"Invalid skill name: {manifest}")
    files = {}
    for manifest in manifests:
        for path in manifest.parent.rglob("*"):
            if path.is_symlink():
                raise ValueError(f"Symlinks are not supported: {path}")
            if path.is_file():
                files[path.relative_to(source)] = path.read_bytes()
    return files


def sync(root, check=False):
    files = source_files(root)
    differences = []
    for directory in (".agents", ".claude"):
        target = root / directory / "skills"
        # Never traverse an existing linked discovery directory.
        if (root / directory).is_symlink() or target.is_symlink():
            raise ValueError(f"Discovery directory must not be a symlink: {target}")
        existing = {p.relative_to(target) for p in target.rglob("*") if p.is_file()}
        stale = existing - files.keys()
        if stale:
            raise ValueError(f"Unexpected discovery files in {target}: {sorted(map(str, stale))}; review manually")
        for relative, data in files.items():
            destination = target / relative
            if any(p.is_symlink() for p in (destination, *destination.parents) if p != root.parent):
                raise ValueError(f"Linked destination: {destination}")
            if not destination.exists() or destination.read_bytes() != data:
                differences.append(str(destination.relative_to(root)))
                if not check:
                    destination.parent.mkdir(parents=True, exist_ok=True)
                    destination.write_bytes(data)
    return differences


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Report drift without changing files")
    args = parser.parse_args()
    try:
        differences = sync(Path(__file__).resolve().parents[1], args.check)
    except (ValueError, OSError) as error:
        print(error, file=sys.stderr)
        return 2
    if differences:
        print("\n".join(differences))
    else:
        print("Skill discovery copies are current")
    return 1 if args.check and differences else 0


if __name__ == "__main__":
    sys.exit(main())
