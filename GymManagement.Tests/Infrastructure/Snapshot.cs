using System.Text;

namespace GymManagement.Tests.Infrastructure
{
    /// <summary>
    /// "Snapshot" files are documents that are generated from the running API and committed
    /// to the repo (docs/openapi.json, docs/ENDPOINTS.md). A test fails when the code changed
    /// but the file was not regenerated, so the docs can never silently go out of date.
    ///
    /// To regenerate after an intended change (PowerShell):
    ///   $env:UPDATE_SNAPSHOTS = "1"; dotnet test; Remove-Item Env:UPDATE_SNAPSHOTS
    /// then review the diff in git before committing.
    /// </summary>
    internal static class Snapshot
    {
        private const string UpdateVariable = "UPDATE_SNAPSHOTS";

        public static string RepoRoot { get; } = FindRepoRoot();

        public static void AssertMatches(string relativePath, string actual)
        {
            var path = Path.Combine(RepoRoot, relativePath);

            // The repo uses CRLF; comparing normalized text ignores git's line-ending settings.
            actual = actual.ReplaceLineEndings("\r\n");

            if (Environment.GetEnvironmentVariable(UpdateVariable) == "1")
            {
                Directory.CreateDirectory(Path.GetDirectoryName(path)!);
                File.WriteAllText(path, actual, new UTF8Encoding(encoderShouldEmitUTF8Identifier: false));
                return;
            }

            var hint = $"Regenerate it: $env:{UpdateVariable} = \"1\"; dotnet test; Remove-Item Env:{UpdateVariable}";
            Assert.True(File.Exists(path), $"{relativePath} does not exist. {hint}");

            var expected = File.ReadAllText(path).ReplaceLineEndings("\r\n");
            Assert.True(expected == actual, $"{relativePath} is out of date with the code. {hint}");
        }

        private static string FindRepoRoot()
        {
            var dir = new DirectoryInfo(AppContext.BaseDirectory);
            while (dir is not null && !File.Exists(Path.Combine(dir.FullName, "GymManagementSystem.sln")))
                dir = dir.Parent;

            return dir?.FullName ?? throw new InvalidOperationException("GymManagementSystem.sln was not found above the test folder.");
        }
    }
}
