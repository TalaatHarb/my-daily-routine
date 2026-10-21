FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY apps/api/src/MyDailyRoutine.Api/MyDailyRoutine.Api.csproj apps/api/src/MyDailyRoutine.Api/
RUN dotnet restore apps/api/src/MyDailyRoutine.Api/MyDailyRoutine.Api.csproj
COPY apps/api/src/MyDailyRoutine.Api/ apps/api/src/MyDailyRoutine.Api/
RUN dotnet publish apps/api/src/MyDailyRoutine.Api/MyDailyRoutine.Api.csproj -c Release -o /out --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /out .
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
USER app
ENTRYPOINT ["dotnet", "MyDailyRoutine.Api.dll"]
