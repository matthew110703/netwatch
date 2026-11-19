#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT_DIR = process.cwd();
const DEFAULT_DS_PATH = path.resolve(ROOT_DIR, "../ripperdoc");
const DS_PATH = process.env.RIPPERDOC_DS_PATH
  ? path.resolve(ROOT_DIR, process.env.RIPPERDOC_DS_PATH)
  : DEFAULT_DS_PATH;

const localYalcCmd = path.resolve(
  ROOT_DIR,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "yalc.cmd" : "yalc",
);
function resolveYalcExec() {
  if (fs.existsSync(localYalcCmd)) {
    return `"${localYalcCmd}"`;
  }
  try {
    execSync("yalc --version", { stdio: "ignore" });
    return "yalc";
  } catch {
    return "pnpm dlx yalc";
  }
}
const YALC_EXEC = resolveYalcExec();

const SCOPE = "@ripperdoc-chrome77/";

function clearNextDevCache() {
  const nextDevDir = path.resolve(ROOT_DIR, ".next", "dev");
  if (!fs.existsSync(nextDevDir)) return;
  try {
    fs.rmSync(nextDevDir, { recursive: true, force: true });
    console.log("  ✔ Cleared .next/dev cache after link state change");
  } catch (err) {
    console.warn(
      `\x1b[33m[WARN] Could not remove .next/dev cache (${err.message}). If dev server is running, restart it.\x1b[0m`,
    );
  }
}

function findDSPackages() {
  const packagesDir = path.resolve(DS_PATH, "packages");
  if (!fs.existsSync(packagesDir)) {
    console.error(
      `\x1b[31m[ERROR] Design system repository not found at:\x1b[0m ${DS_PATH}`,
    );
    console.error(
      `Please ensure 'ripperdoc' is located in the parent directory (../ripperdoc) or set RIPPERDOC_DS_PATH.`,
    );
    process.exit(1);
  }

  const entries = fs.readdirSync(packagesDir, { withFileTypes: true });
  const dsPackages = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const pkgJsonPath = path.resolve(packagesDir, entry.name, "package.json");
      if (fs.existsSync(pkgJsonPath)) {
        try {
          const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
          if (pkgJson.name && pkgJson.name.startsWith(SCOPE)) {
            dsPackages.push({
              name: pkgJson.name,
              shortName: entry.name,
              dir: path.resolve(packagesDir, entry.name),
              version: pkgJson.version,
            });
          }
        } catch {}
      }
    }
  }

  return dsPackages;
}

function getAppDeps() {
  const pkgJsonPath = path.resolve(ROOT_DIR, "package.json");
  if (!fs.existsSync(pkgJsonPath)) return [];
  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
  const allDeps = {
    ...pkgJson.dependencies,
    ...pkgJson.devDependencies,
  };
  return Object.keys(allDeps).filter((dep) => dep.startsWith(SCOPE));
}

function getPackageStatus(pkgName) {
  const yalcPkgPath = path.resolve(ROOT_DIR, ".yalc", ...pkgName.split("/"));
  if (fs.existsSync(yalcPkgPath)) {
    return { status: "yalc", details: "Yalc Local Link (.yalc/)" };
  }

  const nodeModulesPath = path.resolve(
    ROOT_DIR,
    "node_modules",
    ...pkgName.split("/"),
  );
  if (!fs.existsSync(nodeModulesPath)) {
    return { status: "not-installed", details: "Not installed" };
  }

  try {
    const realPath = fs.realpathSync(nodeModulesPath);
    const normalizedReal = path.resolve(realPath).toLowerCase();
    const normalizedRoot = path.resolve(ROOT_DIR).toLowerCase();
    const normalizedDs = path.resolve(DS_PATH).toLowerCase();
    const normalizedYalc = path.resolve(ROOT_DIR, ".yalc").toLowerCase();

    if (normalizedReal.startsWith(normalizedYalc)) {
      return { status: "yalc", details: `Yalc Local Link (${realPath})` };
    }
    if (
      normalizedReal.startsWith(normalizedDs) ||
      !normalizedReal.startsWith(normalizedRoot)
    ) {
      return { status: "symlink", details: `Symlink (${realPath})` };
    }
    const pkgJsonPath = path.resolve(nodeModulesPath, "package.json");
    let version = "";
    if (fs.existsSync(pkgJsonPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
      version = pkg.version ? `v${pkg.version}` : "";
    }
    return { status: "registry", details: `Registry (${version || "npm"})` };
  } catch (err) {
    return { status: "unknown", details: err.message };
  }
}

function handleStatus() {
  console.log(
    "\n=============================================================",
  );
  console.log("       RIPPERDOC DESIGN SYSTEM LINK STATUS (YALC)");
  console.log("=============================================================");
  console.log(`Design System Source: \x1b[36m${DS_PATH}\x1b[0m\n`);

  const deps = getAppDeps();
  console.log(`\x1b[1mApplication: netwatch\x1b[0m`);

  for (const dep of deps) {
    const info = getPackageStatus(dep);
    if (info.status === "yalc") {
      console.log(
        `  \x1b[32m✔ ${dep.padEnd(32)}\x1b[0m -> \x1b[32m${info.details}\x1b[0m`,
      );
    } else if (info.status === "registry") {
      console.log(
        `  \x1b[34m📦 ${dep.padEnd(32)}\x1b[0m -> \x1b[34m${info.details}\x1b[0m`,
      );
    } else if (info.status === "symlink") {
      console.log(`  \x1b[33m🔗 ${dep.padEnd(32)}\x1b[0m -> ${info.details}`);
    } else {
      console.log(`  \x1b[31m⚠️  ${dep.padEnd(32)}\x1b[0m -> ${info.details}`);
    }
  }
  console.log(
    "=============================================================\n",
  );
}

function normalizePackageName(name) {
  const clean = name.trim().toLowerCase();
  return clean.startsWith(SCOPE) ? clean : `${SCOPE}${clean}`;
}

function matchesTarget(pkgName, shortName, targets) {
  if (!targets || targets.length === 0) return true;
  const lowerPkg = pkgName.toLowerCase();
  const lowerShort = (
    shortName || lowerPkg.replace(SCOPE, "")
  ).toLowerCase();
  return targets.some((target) => {
    const norm = normalizePackageName(target);
    const short = norm.replace(SCOPE, "");
    return lowerPkg === norm || lowerShort === short;
  });
}

function handleLink(dsPackages, specifiedTargets = []) {
  const hasFilter = specifiedTargets.length > 0;

  const packagesToPublish = hasFilter
    ? dsPackages.filter((pkg) =>
        matchesTarget(pkg.name, pkg.shortName, specifiedTargets),
      )
    : dsPackages;

  if (hasFilter && packagesToPublish.length === 0) {
    console.error(
      `\x1b[31m[ERROR] No matching design system packages found for: ${specifiedTargets.join(", ")}\x1b[0m`,
    );
    console.log(
      `Available in ${DS_PATH}: ${dsPackages.map((p) => p.name).join(", ")}`,
    );
    process.exit(1);
  }

  console.log(
    `\n\x1b[36m[Ripperdoc] Building design system packages in: ${DS_PATH}...\x1b[0m\n`,
  );
  try {
    const buildTargets = hasFilter
      ? packagesToPublish.map((p) => p.shortName).join(" ")
      : "";
    execSync(`pnpm build ${buildTargets}`.trim(), {
      cwd: DS_PATH,
      stdio: "inherit",
    });
  } catch (err) {
    console.error(
      `\x1b[31m[ERROR] Design system build failed (${err.status || 1}). Aborting yalc link.\x1b[0m`,
    );
    process.exit(1);
  }

  console.log(
    `\n\x1b[36m[Yalc] Publishing packages from: ${DS_PATH}...\x1b[0m\n`,
  );

  for (const pkg of packagesToPublish) {
    try {
      execSync(`${YALC_EXEC} publish`, {
        cwd: pkg.dir,
        stdio: "pipe",
      });
      console.log(`  ✔ Published ${pkg.name} to yalc store`);
    } catch (err) {
      console.error(`  ✖ Could not publish ${pkg.name}: ${err.message}`);
      process.exit(1);
    }
  }

  const appDeps = getAppDeps();
  const packagesToLink = hasFilter
    ? appDeps.filter((dep) => matchesTarget(dep, null, specifiedTargets))
    : appDeps;

  if (packagesToLink.length === 0) {
    console.warn(
      `\x1b[33m[WARN] None of the specified targets (${specifiedTargets.join(", ")}) are dependencies in netwatch.\x1b[0m`,
    );
    handleStatus();
    return;
  }

  console.log(
    `\n\x1b[36m[Yalc] Linking packages into netwatch: ${packagesToLink.join(", ")}...\x1b[0m\n`,
  );
  try {
    execSync(`${YALC_EXEC} add ${packagesToLink.join(" ")}`, {
      cwd: ROOT_DIR,
      stdio: "inherit",
    });
    console.log(
      `\n\x1b[36m[Yalc] Running pnpm install to apply links...\x1b[0m`,
    );
    execSync(`pnpm install`, {
      cwd: ROOT_DIR,
      stdio: "inherit",
    });
    clearNextDevCache();
    console.log(
      `\x1b[32m✔ Successfully linked ${packagesToLink.join(", ")} via yalc!\x1b[0m\n`,
    );
  } catch (err) {
    console.error(
      `\x1b[31m✖ Failed adding yalc packages: ${err.message}\x1b[0m\n`,
    );
  }

  handleStatus();
}

function restoreRegistryVersionsInPkgJson(packageNames) {
  const pkgJsonPath = path.resolve(ROOT_DIR, "package.json");
  if (!fs.existsSync(pkgJsonPath)) return;
  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
  pkgJson.dependencies = pkgJson.dependencies || {};

  const dsVersionMap = new Map();
  const packagesDir = path.resolve(DS_PATH, "packages");
  if (fs.existsSync(packagesDir)) {
    for (const entry of fs.readdirSync(packagesDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const dsPkgPath = path.resolve(packagesDir, entry.name, "package.json");
      if (fs.existsSync(dsPkgPath)) {
        try {
          const dsPkg = JSON.parse(fs.readFileSync(dsPkgPath, "utf8"));
          if (dsPkg.name && dsPkg.version && dsPkg.version !== "0.0.0") {
            dsVersionMap.set(dsPkg.name, `^${dsPkg.version}`);
          }
        } catch {}
      }
    }
  }

  let modified = false;
  for (const pkgName of packageNames) {
    const current = pkgJson.dependencies[pkgName];
    const targetRange = dsVersionMap.get(pkgName) || "latest";
    if (!current || String(current).startsWith("file:.yalc") || current !== targetRange) {
      pkgJson.dependencies[pkgName] = targetRange;
      modified = true;
    }
  }

  if (modified) {
    // Keep dependencies sorted alphabetically
    const sortedDeps = {};
    for (const key of Object.keys(pkgJson.dependencies).sort()) {
      sortedDeps[key] = pkgJson.dependencies[key];
    }
    pkgJson.dependencies = sortedDeps;
    fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + "\n", "utf8");
  }
}

function handleUnlink(specifiedTargets = []) {
  const hasFilter = specifiedTargets.length > 0;
  const appDeps = getAppDeps();

  if (hasFilter) {
    const packagesToUnlink = appDeps.filter((dep) =>
      matchesTarget(dep, null, specifiedTargets),
    );

    if (packagesToUnlink.length === 0) {
      console.warn(
        `\x1b[33m[WARN] None of the specified targets (${specifiedTargets.join(", ")}) are dependencies in netwatch.\x1b[0m`,
      );
      handleStatus();
      return;
    }

    console.log(
      `\n\x1b[36m[Yalc] Unlinking specified packages: ${packagesToUnlink.join(", ")}...\x1b[0m\n`,
    );
    try {
      execSync(`${YALC_EXEC} remove ${packagesToUnlink.join(" ")}`, {
        cwd: ROOT_DIR,
        stdio: "inherit",
      });
    } catch {}

    restoreRegistryVersionsInPkgJson(packagesToUnlink);

    const remainingYalc = getAppDeps().some(
      (dep) => getPackageStatus(dep).status === "yalc",
    );
    if (!remainingYalc) {
      const yalcDir = path.resolve(ROOT_DIR, ".yalc");
      if (fs.existsSync(yalcDir)) {
        fs.rmSync(yalcDir, { recursive: true, force: true });
      }
      const yalcLock = path.resolve(ROOT_DIR, "yalc.lock");
      if (fs.existsSync(yalcLock)) {
        fs.rmSync(yalcLock, { force: true });
      }
    }

    console.log(
      "\x1b[36mRestoring registry packages via pnpm install...\x1b[0m",
    );
    execSync("pnpm install", { cwd: ROOT_DIR, stdio: "inherit" });
    clearNextDevCache();

    console.log(
      `\x1b[32m✔ Successfully restored registry packages for ${packagesToUnlink.join(", ")}!\x1b[0m\n`,
    );
  } else {
    console.log(`\n\x1b[36m[Yalc] Unlinking all ${SCOPE} packages...\x1b[0m\n`);

    try {
      execSync(`${YALC_EXEC} remove --all`, {
        cwd: ROOT_DIR,
        stdio: "inherit",
      });
    } catch {}

    restoreRegistryVersionsInPkgJson(appDeps);

    const yalcDir = path.resolve(ROOT_DIR, ".yalc");
    if (fs.existsSync(yalcDir)) {
      fs.rmSync(yalcDir, { recursive: true, force: true });
    }
    const yalcLock = path.resolve(ROOT_DIR, "yalc.lock");
    if (fs.existsSync(yalcLock)) {
      fs.rmSync(yalcLock, { force: true });
    }

    console.log(
      "\x1b[36mRestoring registry packages via pnpm install...\x1b[0m",
    );
    execSync("pnpm install", { cwd: ROOT_DIR, stdio: "inherit" });
    clearNextDevCache();

    console.log(`\x1b[32m✔ Successfully restored registry packages!\x1b[0m\n`);
  }

  handleStatus();
}

function handleCheck() {
  const deps = getAppDeps();
  const linkedItems = [];

  for (const dep of deps) {
    const info = getPackageStatus(dep);
    if (info.status === "yalc" || info.status === "symlink") {
      linkedItems.push({
        pkg: dep,
        details: info.details,
      });
    }
  }

  const yalcDir = path.resolve(ROOT_DIR, ".yalc");
  const yalcLock = path.resolve(ROOT_DIR, "yalc.lock");
  if (fs.existsSync(yalcDir) || fs.existsSync(yalcLock)) {
    if (linkedItems.length === 0) {
      linkedItems.push({
        pkg: "local .yalc artifacts",
        details: "found .yalc or yalc.lock",
      });
    }
  }

  const pkgJsonPath = path.resolve(ROOT_DIR, "package.json");
  if (fs.existsSync(pkgJsonPath)) {
    try {
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
      const allDeps = {
        ...pkgJson.dependencies,
        ...pkgJson.devDependencies,
      };
      for (const [dep, val] of Object.entries(allDeps)) {
        if (
          dep.startsWith(SCOPE) &&
          typeof val === "string" &&
          val.startsWith("file:.yalc")
        ) {
          const already = linkedItems.some((i) => i.pkg === dep);
          if (!already) {
            linkedItems.push({
              pkg: dep,
              details: val,
            });
          }
        }
      }
    } catch {}
  }

  if (linkedItems.length > 0) {
    console.error(
      "\n\x1b[31m=============================================================",
    );
    console.error(
      "  ✖ [PRE-COMMIT BLOCKED] LOCAL YALC DESIGN SYSTEM LINKS FOUND",
    );
    console.error(
      "=============================================================\x1b[0m\n",
    );
    console.error("Local Yalc links were detected in netwatch:\n");
    for (const item of linkedItems) {
      console.error(`  - \x1b[31m${item.pkg}\x1b[0m (${item.details})`);
    }
    console.error(
      "\n\x1b[36mLocal Yalc links must not be committed to source control.\x1b[0m",
    );
    console.error(
      "Please run \x1b[32mpnpm ds:unlink\x1b[0m to restore registry versions before committing.\n",
    );
    process.exit(1);
  }

  console.log(
    "\x1b[32m✔ [ds:check] Clean: No local Yalc design system links detected in netwatch.\x1b[0m",
  );
}

const firstArg = process.argv[2] || "status";
let action = "status";
let rawTargets = [];

if (["link", "unlink", "status", "check"].includes(firstArg)) {
  action = firstArg;
  rawTargets = process.argv.slice(3);
} else {
  action = "link";
  rawTargets = process.argv.slice(2);
}

const specifiedTargets = rawTargets
  .filter((arg) => arg !== "--")
  .flatMap((arg) => arg.split(","))
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

switch (action) {
  case "link": {
    const dsPackages = findDSPackages();
    handleLink(dsPackages, specifiedTargets);
    break;
  }
  case "unlink":
    handleUnlink(specifiedTargets);
    break;
  case "check":
    handleCheck();
    break;
  case "status":
  default:
    handleStatus();
    break;
}
