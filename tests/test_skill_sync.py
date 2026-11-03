import importlib.util
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("sync_skills", ROOT / "scripts/sync_skills.py")
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class SkillDiscoveryTests(unittest.TestCase):
    def setUp(self):
        temporary = ROOT / ".TMP" / "tests"
        temporary.mkdir(parents=True, exist_ok=True)
        self.folder = tempfile.TemporaryDirectory(dir=temporary)
        self.addCleanup(self.folder.cleanup)
        self.root = Path(self.folder.name)
        self.skill = self.root / "skills" / "example"
        self.skill.mkdir(parents=True)
        (self.skill / "SKILL.md").write_text(
            "---\nname: example\ndescription: Verify example workflows.\n---\nRead references/check.md.\n", encoding="utf-8")
        (self.skill / "references").mkdir()
        (self.skill / "references/check.md").write_text("Evidence", encoding="utf-8")

    def test_discovery_copies_include_references_and_are_idempotent(self):
        self.assertEqual(len(MODULE.sync(self.root)), 4)
        self.assertEqual(MODULE.sync(self.root), [])
        for host in (".agents", ".claude"):
            self.assertEqual((self.root / host / "skills/example/references/check.md").read_text(), "Evidence")

    def test_check_detects_drift_without_repairing_it(self):
        MODULE.sync(self.root)
        destination = self.root / ".agents/skills/example/SKILL.md"
        destination.write_text("Modified")
        self.assertEqual(len(MODULE.sync(self.root, check=True)), 1)
        self.assertEqual(destination.read_text(), "Modified")
        MODULE.sync(self.root)
        self.assertEqual(MODULE.sync(self.root, check=True), [])

    def test_invalid_skill_fails_before_creating_discovery_directories(self):
        (self.skill / "SKILL.md").write_text("No frontmatter")
        with self.assertRaises(ValueError):
            MODULE.sync(self.root)
        self.assertFalse((self.root / ".agents").exists())

    def test_unexpected_files_are_preserved_and_reported(self):
        MODULE.sync(self.root)
        unknown = self.root / ".claude/skills/local.txt"
        unknown.write_text("Keep")
        with self.assertRaises(ValueError):
            MODULE.sync(self.root)
        self.assertEqual(unknown.read_text(), "Keep")


if __name__ == "__main__":
    unittest.main()
