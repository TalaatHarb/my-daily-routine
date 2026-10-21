using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyDailyRoutine.Api.Dtos;
using MyDailyRoutine.Api.Services;

namespace MyDailyRoutine.Api.Controllers;

[ApiController, Authorize, Route("tasks")]
public sealed class TasksController(ITaskService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TaskDto>>> List([FromQuery] TaskQuery query, CancellationToken ct) => Ok(await service.ListAsync(query, ct));
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<TaskDto>> Get(Guid id, CancellationToken ct) => Ok(await service.GetAsync(id, ct));
    [HttpPost]
    public async Task<ActionResult<TaskDto>> Create(CreateTaskRequest request, CancellationToken ct)
    {
        var task = await service.CreateAsync(request, ct);
        return CreatedAtAction(nameof(Get), new { id = task.Id }, task);
    }
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<TaskDto>> Replace(Guid id, ReplaceTaskRequest request, CancellationToken ct) => Ok(await service.ReplaceAsync(id, request, ct));
    [HttpPatch("{id:guid}/status")]
    public async Task<ActionResult<TaskDto>> Status(Guid id, StatusRequest request, CancellationToken ct) => Ok(await service.SetStatusAsync(id, request.Status!.Value, ct));
    [HttpPost("{id:guid}/move")]
    public async Task<ActionResult<TaskDto>> Move(Guid id, MoveTaskRequest request, CancellationToken ct) => Ok(await service.MoveAsync(id, request.PlannedDate!.Value, ct));
    [HttpPost("{id:guid}/duplicate")]
    public async Task<ActionResult<TaskDto>> Duplicate(Guid id, CancellationToken ct)
    {
        var task = await service.DuplicateAsync(id, ct);
        return CreatedAtAction(nameof(Get), new { id = task.Id }, task);
    }
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct) { await service.DeleteAsync(id, ct); return NoContent(); }
}
