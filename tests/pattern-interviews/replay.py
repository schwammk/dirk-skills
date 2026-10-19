#!/usr/bin/env python3
"""Sample interview wording through OpenCode's documented stateless API.

This records outputs for manual assessment. It does not claim semantic correctness
or tool activation from a keyword match. Each request is a fresh context.
"""

import argparse
import concurrent.futures
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import time


def api(method, path, payload=None):
    command = ["opencode", "api", method, path]
    if payload is not None:
        command.extend(["--data", json.dumps(payload)])
    # The CLI can truncate large piped stdout; a regular file drains it safely.
    with tempfile.TemporaryFile(mode="w+") as output:
        result = subprocess.run(
            command, stdout=output, stderr=subprocess.PIPE, text=True, timeout=300
        )
        output.seek(0)
        body = output.read()
    if result.returncode:
        raise RuntimeError(
            f"API exit {result.returncode}: {result.stderr.strip()}; {body[:2000]}"
        )
    return json.loads(body)


def prompt_for(case, instructions):
    return (
        "You are conducting a software design interview. The following skill "
        "instructions and supporting references have already been loaded. "
        "Apply them to the user's next turn. Produce the actual next user-facing "
        "question, not a report about the instructions. This wording-only run "
        "has no tools; do not claim to invoke tools. Do not implement changes.\n\n"
        + instructions
        + "\n\n<user>\n"
        + case["prompt"]
        + "\n</user>\n"
    )


def sample(case, repetition, instructions, output):
    stem = f"{case['id']}-{repetition:02d}"
    prompt = prompt_for(case, instructions)
    started = time.time()
    record = {"case": case["id"], "sample": repetition, "started": started}
    try:
        response = api("post", "/api/experimental/generate", {"prompt": prompt})
        text = response["data"]["text"]
        record.update(status="ok", response=response)
        (output / f"{stem}.md").write_text(text + "\n")
    except (RuntimeError, subprocess.TimeoutExpired, json.JSONDecodeError, KeyError) as error:
        record.update(status="error", error=str(error))
    record["elapsed_seconds"] = round(time.time() - started, 3)
    (output / f"{stem}.json").write_text(json.dumps(record, indent=2) + "\n")
    return stem, record["status"]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--instructions", type=Path, action="append", required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--samples", type=int, default=5)
    parser.add_argument("--workers", type=int, default=3)
    parser.add_argument("--case", action="append")
    parser.add_argument(
        "--prepare", action="store_true",
        help="Write blind prompt packets for native single-shot subagents; make no API calls.",
    )
    parser.add_argument(
        "--fixtures", type=Path, default=Path(__file__).with_name("fixtures.json")
    )
    args = parser.parse_args()
    if args.samples < 5 or args.workers < 1:
        parser.error("Use at least five samples and one worker.")
    cases = json.loads(args.fixtures.read_text())
    if args.case:
        selected = set(args.case)
        known = {case["id"] for case in cases}
        if selected - known:
            parser.error(f"Unknown cases: {sorted(selected - known)}")
        cases = [case for case in cases if case["id"] in selected]
    if not cases or len({case["id"] for case in cases}) != len(cases):
        parser.error("Fixture IDs must be nonempty and unique.")

    args.out.mkdir(parents=True, exist_ok=False)
    sources = []
    context = []
    for number, path in enumerate(args.instructions):
        text = path.read_text()
        snapshot = f"source-{number:02d}-{path.name}"
        (args.out / snapshot).write_text(text)
        sources.append(
            {"path": str(path.resolve()), "snapshot": snapshot,
             "sha256": hashlib.sha256(text.encode()).hexdigest()}
        )
        context.append(f"<instructions source={json.dumps(path.name)}>\n{text}\n</instructions>")
    manifest = {
        "api": "/api/experimental/generate",
        "model": "server base-configuration default; no explicit model override",
        "samples_per_case": args.samples,
        "cases": cases,
        "sources": sources,
        "scope": "wording only; manual semantic assessment and separate tool-activation test required",
        "transport": "native subagent packets" if args.prepare else "stateless API",
    }
    (args.out / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    if args.prepare:
        for case in cases:
            (args.out / f"{case['id']}.prompt.md").write_text(
                prompt_for(case, "\n\n".join(context))
            )
        print(f"Prepared {len(cases)} blind packets for {args.samples} fresh samples each.")
        return
    name, status = sample(cases[0], 1, "\n\n".join(context), args.out)
    print(f"{name}: {status}", flush=True)
    if status != "ok":
        raise SystemExit("Stopped after the first transport error; no behavioral verdict.")
    failures = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        jobs = [
            pool.submit(sample, case, repetition, "\n\n".join(context), args.out)
            for case in cases for repetition in range(1, args.samples + 1)
            if case is not cases[0] or repetition != 1
        ]
        for job in concurrent.futures.as_completed(jobs):
            name, status = job.result()
            print(f"{name}: {status}", flush=True)
            failures += status != "ok"
    raise SystemExit(1 if failures else 0)


if __name__ == "__main__":
    main()
