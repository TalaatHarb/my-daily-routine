using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyDailyRoutine.Api.Dtos;
using MyDailyRoutine.Api.Services;

namespace MyDailyRoutine.Api.Controllers;

[ApiController, Authorize, Route("me")]
public sealed class MeController(IUserService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<UserDto>> Get(CancellationToken ct) => Ok(await service.GetAsync(ct));
    [HttpPut]
    public async Task<ActionResult<UserDto>> Update(UpdateUserRequest request, CancellationToken ct) => Ok(await service.UpdateAsync(request, ct));
}
