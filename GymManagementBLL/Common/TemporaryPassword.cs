using System.Security.Cryptography;

namespace GymManagementBLL.Common
{
    /// <summary>Generates random temporary passwords that pass our password rules.</summary>
    public static class TemporaryPassword
    {
        private const string Upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I / O (look like 1 / 0)
        private const string Lower = "abcdefghijkmnpqrstuvwxyz"; // no l / o
        private const string Digits = "23456789";                // no 0 / 1
        private const int Length = 12;

        public static string Generate()
        {
            // At least one character of each kind, the rest from all of them, then shuffled.
            // RandomNumberGenerator (not Random) because passwords must be unpredictable.
            var chars = new char[Length];
            chars[0] = RandomNumberGenerator.GetItems<char>(Upper, 1)[0];
            chars[1] = RandomNumberGenerator.GetItems<char>(Lower, 1)[0];
            chars[2] = RandomNumberGenerator.GetItems<char>(Digits, 1)[0];
            RandomNumberGenerator.GetItems<char>(Upper + Lower + Digits, Length - 3).CopyTo(chars, 3);

            RandomNumberGenerator.Shuffle(chars.AsSpan());
            return new string(chars);
        }
    }
}
