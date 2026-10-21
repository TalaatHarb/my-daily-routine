using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyDailyRoutine.Api.Dtos;
using MyDailyRoutine.Api.Services;

namespace MyDailyRoutine.Api.Controllers;

[ApiController, Authorize, Route("tags")]
public sealed class TagsController(ITagService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<LabelSummaryDto>>> List([FromQuery] string? search, [FromQuery] int? limit, CancellationToken ct) => Ok(await service.ListAsync(search, limit, ct));
    [HttpPost]
    public async Task<ActionResult<LabelDto>> Create(LabelRequest request, CancellationToken ct)
    {
        var label = await service.CreateAsync(request, ct);
        return Created($"/tags/{label.Id}", label);
    }
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<LabelDto>> Update(Guid id, LabelRequest request, CancellationToken ct) => Ok(await service.UpdateAsync(id, request, ct));
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct) { await service.DeleteAsync(id, ct); return NoContent(); }
}
