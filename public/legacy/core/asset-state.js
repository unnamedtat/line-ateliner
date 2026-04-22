// Centralized persistent source / texture asset state.

function createSceneAssetRecord(kind, overrides = {}) {
  return {
    kind,
    image: null,
    href: "",
    blob: null,
    objectUrl: "",
    label: kind === "source" ? "figure.avif" : "未选择纹理",
    version: 0,
    ...overrides
  };
}

const sceneAssetState = {
  source: createSceneAssetRecord("source", {
    href: window.__lineAtelierDefaultSourceHref || SOURCE_IMAGE_PATH,
    blob: window.__lineAtelierDefaultSourceBlob || null,
    objectUrl: window.__lineAtelierDefaultSourceHref || "",
    label: "figure.avif"
  }),
  texture: createSceneAssetRecord("texture", {
    href: "",
    label: "未选择纹理"
  })
};

// Gets a scene asset record by kind.
function getSceneAssetRecord(kind = "source") {
  return kind === "texture" ? sceneAssetState.texture : sceneAssetState.source;
}

// Checks whether an href is a blob URL.
function isSceneAssetBlobHref(href) {
  return typeof href === "string" && href.startsWith("blob:");
}

// Syncs centralized asset state back to legacy globals.
function syncSceneAssetGlobals(kind = "source") {
  const record = getSceneAssetRecord(kind);

  if (kind === "source") {
    sourceImage = record.image;
    sourceImageHref = record.href;
    sourceImageLabel = record.label;
    sourceImageBlob = record.blob;
    sourceImageObjectUrl = record.objectUrl;
    return record;
  }

  uploadedTextureImage = record.image;
  uploadedTextureHref = record.href;
  uploadedTextureLabel = record.label;
  return record;
}

// Revokes a scene asset blob URL if we own it.
function revokeSceneAssetObjectUrl(kind = "source") {
  const record = getSceneAssetRecord(kind);
  const targetUrl = record.objectUrl;
  if (!isSceneAssetBlobHref(targetUrl)) {
    record.objectUrl = "";
    return false;
  }

  URL.revokeObjectURL(targetUrl);
  record.objectUrl = "";
  if (record.href === targetUrl) {
    record.href = "";
  }
  syncSceneAssetGlobals(kind);
  return true;
}

// Updates one scene asset record and keeps legacy globals aligned.
function updateSceneAssetRecord(kind = "source", patch = {}, options = {}) {
  const {
    revokePreviousObjectUrl = true
  } = options;
  const record = getSceneAssetRecord(kind);
  const previousObjectUrl = record.objectUrl;
  const nextRecord = {
    ...record,
    ...patch,
    version: record.version + 1
  };

  sceneAssetState[kind] = nextRecord;
  syncSceneAssetGlobals(kind);

  if (
    revokePreviousObjectUrl &&
    isSceneAssetBlobHref(previousObjectUrl) &&
    previousObjectUrl !== nextRecord.objectUrl &&
    previousObjectUrl !== nextRecord.href
  ) {
    URL.revokeObjectURL(previousObjectUrl);
  }

  return nextRecord;
}

// Clears the volatile image handle while keeping the persistent source data.
function clearSceneAssetImage(kind = "source") {
  return updateSceneAssetRecord(
    kind,
    {
      image: null
    },
    {
      revokePreviousObjectUrl: false
    }
  );
}

// Gets the persistent href for a scene asset.
function getSceneAssetPersistentHref(kind = "source") {
  return getSceneAssetRecord(kind).href || "";
}

// Gets the persistent blob for a scene asset.
function getSceneAssetBlob(kind = "source") {
  return getSceneAssetRecord(kind).blob || null;
}

// Gets the current in-memory image for a scene asset.
function getSceneAssetImage(kind = "source") {
  return getSceneAssetRecord(kind).image || null;
}

// Returns whether the asset has enough persistent data to be restored.
function canRestoreSceneAsset(kind = "source") {
  const record = getSceneAssetRecord(kind);
  return Boolean(record.blob || record.href);
}

// Initializes centralized state from the bootstrap globals.
syncSceneAssetGlobals("source");
syncSceneAssetGlobals("texture");
