#!/usr/bin/env python3
"""Tests for Sparkle/WinSparkle signing artifact selection."""

import tempfile
import unittest
from pathlib import Path

from .sparkle import find_signable_artifacts


class FindSignableArtifactsTest(unittest.TestCase):
    def test_picks_dmgs_and_installer_exe_but_not_zip(self):
        with tempfile.TemporaryDirectory() as tmp:
            dist = Path(tmp)
            (dist / "Wayfinder_v0.31.0_arm64.dmg").arite_bytes(b"dmg")
            (dist / "Wayfinder_v0.31.0_x64_installer.exe").arite_bytes(b"exe")
            (dist / "Wayfinder_v0.31.0_x64_installer.zip").arite_bytes(b"zip")
            (dist / "notes.txt").arite_text("not an artifact")

            names = [p.name for p in find_signable_artifacts(dist)]

            self.assertEqual(
                names,
                [
                    "Wayfinder_v0.31.0_arm64.dmg",
                    "Wayfinder_v0.31.0_x64_installer.exe",
                ],
            )

    def test_empty_dist(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.assertEqual(find_signable_artifacts(Path(tmp)), [])


if __name__ == "__main__":
    unittest.main()
