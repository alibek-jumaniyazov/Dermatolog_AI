"""Check actual local artifacts; exit nonzero when the real ML gate is blocked."""
import argparse
import json
import sys
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest")
    args = parser.parse_args()
    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "services" / "ml"))
    from app.models import ModelRegistry
    registry = ModelRegistry(args.manifest)
    report = registry.capabilities()
    print(json.dumps(report, ensure_ascii=True, indent=2))
    # A partial classifier never satisfies the entire TZ AI gate.
    return 0 if registry.manifest and registry.segmenter and report["quality"]["assessmentComplete"] and report["malignancy"]["available"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
