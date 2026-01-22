global using AutoMapper;
global using KanjanaburiTravel.Dtos;
global using KanjanaburiTravel.Infrastructure;
global using Microsoft.AspNetCore.Authentication.JwtBearer;
global using Microsoft.AspNetCore.Authorization;
global using Microsoft.AspNetCore.Mvc;
global using Microsoft.EntityFrameworkCore;
global using Microsoft.Extensions.Options;
global using Microsoft.IdentityModel.Tokens;
global using Microsoft.OpenApi.Models;
global using System.IdentityModel.Tokens.Jwt;
global using System.Net;
global using System.Security.Claims;
global using System.Text;
global using TravelKanjanuburi.Mappings;
global using TravelKanjanuburi.Model;
global using TravelKanjanuburi.Services.Interface;
global using TravelKanjanuburi.Services.Users;
global using TravelKanjanuburi.ML;
using KanjanaburiTravel.Services.Users;
using TravelKanjanuburi.Helper;
using TravelKanjanuburi.Services.Places;
using TravelKanjanuburi.Services.Trips;
using TravelKanjanuburi.Services.foods;
using static TravelKanjanuburi.ML.TrainingModels;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<JwtOptions>(
    builder.Configuration.GetSection("Jwt"));
builder.Services.AddAutoMapper(typeof(MappingProfile).Assembly);

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));


builder.Services.AddHttpClient("osrm", client =>
{
    client.Timeout = TimeSpan.FromSeconds(10);
});
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IUserInterestService, UserInterestService>();
builder.Services.AddScoped<IRoleService, RoleService>();
builder.Services.AddScoped<IFileStorage, LocalFileStorage>();
builder.Services.AddScoped<PlaceService>();
builder.Services.AddScoped<PlaceCategoriesService>();
builder.Services.AddScoped<PlaceTagService>();
builder.Services.AddScoped<TripService>();
builder.Services.AddScoped<BehaviorService>();
builder.Services.AddScoped<IInterestMapper, InterestMapper>();
builder.Services.AddScoped<SeedBehaviorService>();
builder.Services.AddScoped<HomeService>();
builder.Services.AddScoped<AutoTripService>();
builder.Services.AddScoped<PlaceOpeningHourService>();
builder.Services.AddScoped<PlaceReviewService>();
builder.Services.AddScoped<LocalDishService>();
builder.Services.AddScoped<ModelProbeService>();


//ML
var modelPath = Path.Combine(AppContext.BaseDirectory, "model.zip");
builder.Services.Configure<HostOptions>(opt =>
{
    opt.BackgroundServiceExceptionBehavior = BackgroundServiceExceptionBehavior.Ignore;
});
builder.Services.Configure<TrainingOptions>(builder.Configuration.GetSection("Training"));
builder.Services.AddSingleton<IModelStore>(_ => new ModelStore(modelPath));
builder.Services.AddScoped<RecommenderService>();
builder.Services.AddHostedService<DailyModelTrainingHostedService>();
builder.Services.AddScoped<IModelTrainingService, ModelTrainingService>();
builder.Services.AddSingleton<TrainingState>();
builder.Services.AddScoped<TrainingStatsService>();


builder.Services.AddEndpointsApiExplorer(); // แนะนำให้มี
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "KanjanaburiTravel API",
        Version = "v1"
    });

    // 🔐 ส่วนนี้สำคัญ: Security Scheme ชื่อ "Bearer"
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Description = "ใส่ JWT แบบ: Bearer {token}",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                },
                Scheme = "Bearer",
                Name = "Bearer",
                In = ParameterLocation.Header
            },
            Array.Empty<string>()
        }
    });
});

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var jwtSection = builder.Configuration.GetSection("Jwt").Get<JwtOptions>()!;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSection.Issuer,
            ValidAudience = jwtSection.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtSection.SigningKey)),
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowSpecificOrigins", policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:5173",      // dev front
                "https://your-frontend.com"  // ค่า production
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();             // ใช้ cookie ได้
    });
});

builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.Converters.Add(new TimeOnlyJsonConverter());
    });

var app = builder.Build();

app.UseForwardedHeaders();

//var pathBase = "/cs67/reactnative/boat";
//app.UsePathBase(pathBase);

//app.UseSwagger();
//app.UseSwaggerUI(c =>
//{
//    c.SwaggerEndpoint("/cs67/reactnative/boat/swagger/v1/swagger.json", "RedMango API v1");
//    c.RoutePrefix = "swagger";
//});

// ใช้ไฟล์สแตติก (ถ้ามีอัปโหลดไฟล์/รูป)
app.UseStaticFiles();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseCors("AllowSpecificOrigins");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapFallbackToFile("index.html");


app.Run();