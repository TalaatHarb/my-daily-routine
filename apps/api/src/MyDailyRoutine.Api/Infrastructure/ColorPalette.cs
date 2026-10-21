using System.Text;
using System.Text.RegularExpressions;

namespace MyDailyRoutine.Api.Infrastructure;

public static partial class ColorPalette
{
    public static IReadOnlyList<string> Colors { get; } = Array.AsReadOnly(new[]
    {
        "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e", "#14b8a6",
        "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#d946ef", "#ec4899"
    });
    public static string ForName(string normalizedName)
    {
        uint hash = 2166136261;
        foreach (var b in Encoding.UTF8.GetBytes(normalizedName)) hash = unchecked((hash ^ b) * 16777619);
        return Colors[(int)(hash % (uint)Colors.Count)];
    }
    public static string Resolve(string? color, string normalizedName)
    {
        if (color is null) return ForName(normalizedName);
        if (color.Length != 7 || !HexColor().IsMatch(color)) throw new ValidationException("color", "Color must be #rrggbb.");
        return color.ToLowerInvariant();
    }
    [GeneratedRegex("^#[0-9a-fA-F]{6}$", RegexOptions.CultureInvariant)]
    private static partial Regex HexColor();
}
