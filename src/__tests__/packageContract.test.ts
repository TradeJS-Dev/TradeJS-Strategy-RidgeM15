import manifest from "../../package.json";

it("uses matching peer and development versions for TradeJS runtime packages", () => {
  const tradejsVersions = (dependencies: Record<string, string>) =>
    Object.fromEntries(
      Object.entries(dependencies).filter(([name]) =>
        name.startsWith("@tradejs/"),
      ),
    );

  const { dependencies } = manifest as typeof manifest & {
    dependencies?: Record<string, string>;
  };

  expect(tradejsVersions(dependencies ?? {})).toEqual({});
  expect(tradejsVersions(manifest.devDependencies)).toEqual(
    tradejsVersions(manifest.peerDependencies),
  );
});
