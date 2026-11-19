import assert from "node:assert/strict";
import { test } from "node:test";
import { resolve, dirname } from "node:path";
import { testDirectories } from "../lib/owned-test.mjs";

test("owned profile cleanup rejects real identities and path traversal", () => {
  const environment = { APPDATA: resolve("roaming"), LOCALAPPDATA: resolve("local") };
  for (const id of ["dev.goodgood.taskmanager", "dev.goodgood.taskmanager.test", "..", "dev.goodgood.taskmanager.test.a/../b", "dev.goodgood.taskmanager.test.a\\b"])
    assert.throws(() => testDirectories(id, environment));
  assert.deepEqual(testDirectories("dev.goodgood.taskmanager.test.run-1", environment).map(dirname), Object.values(environment));
  assert.throws(() => testDirectories("dev.goodgood.taskmanager.test.run-1", {}));
});
