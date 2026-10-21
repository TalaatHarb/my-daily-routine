using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace MyDailyRoutine.Api.Infrastructure;

public sealed class TimeOnlyJsonConverter : JsonConverter<TimeOnly>
{
    public override TimeOnly Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.String && TimeOnly.TryParseExact(reader.GetString(),
                ["HH:mm", "HH:mm:ss"], CultureInfo.InvariantCulture, DateTimeStyles.None, out var time)) return time;
        throw new JsonException("Time must be HH:mm or HH:mm:ss.");
    }
    public override void Write(Utf8JsonWriter writer, TimeOnly value, JsonSerializerOptions options) =>
        writer.WriteStringValue(value.ToString("HH:mm", CultureInfo.InvariantCulture));
}
