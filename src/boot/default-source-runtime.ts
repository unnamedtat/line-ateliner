export type DefaultSourceAsset = {
  blob: Blob;
  objectUrl: string;
};

let defaultSourceAssetPromise: Promise<DefaultSourceAsset> | null = null;

export async function getDefaultSourceAsset() {
  if (!defaultSourceAssetPromise) {
    defaultSourceAssetPromise = fetch("/figure.avif", {
      cache: "force-cache"
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error(`默认示例资源加载失败 (${response.status})`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      return {
        blob,
        objectUrl
      };
    });
  }

  return defaultSourceAssetPromise;
}
