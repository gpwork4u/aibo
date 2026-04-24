package router

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gpwork4u/aibo/handler"
	"github.com/gpwork4u/aibo/middleware"
	"github.com/gpwork4u/aibo/service"
)

// Setup 設定路由
func Setup(apiKeySvc *service.ApiKeyService, apiKeyHandler *handler.ApiKeyHandler, categoryHandler *handler.CategoryHandler, llmProviderHandler *handler.LlmProviderHandler, entryHandler *handler.EntryHandler, classifyHandler *handler.ClassifyHandler, searchHandler *handler.SearchHandler, gitImportHandler *handler.GitImportHandler, gcalHandler *handler.GcalHandler, confidenceHandler *handler.ConfidenceHandler, statsHandler *handler.StatsHandler, systemHandler *handler.SystemHandler, lifecycleHandler *handler.LifecycleHandler, calendarConvertHandler *handler.CalendarConvertHandler, calendarHandler *handler.CalendarHandler) *gin.Engine {
	r := gin.Default()

	// CORS middleware — 允許跨網域（前端 localhost:3000 呼叫 API localhost:8080）
	r.Use(middleware.CORSMiddleware())

	// 健康檢查（不需認證）
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// API v1 路由群組（需要認證）
	v1 := r.Group("/api/v1")
	v1.Use(middleware.AuthMiddleware(apiKeySvc))
	{
		// API Key 管理
		auth := v1.Group("/auth")
		{
			auth.POST("/api-keys", apiKeyHandler.Create)
			auth.GET("/api-keys", apiKeyHandler.List)
			auth.DELETE("/api-keys/:id", apiKeyHandler.Delete)
		}

		// 分類管理
		categories := v1.Group("/categories")
		{
			categories.POST("", categoryHandler.Create)
			categories.GET("", categoryHandler.List)
			categories.GET("/:id", categoryHandler.GetByID)
			categories.PUT("/:id", categoryHandler.Update)
			categories.DELETE("/:id", categoryHandler.Delete)
		}

		// LLM Provider 管理
		llmProviders := v1.Group("/llm-providers")
		{
			llmProviders.POST("", llmProviderHandler.Create)
			llmProviders.GET("", llmProviderHandler.List)
			llmProviders.GET("/:id", llmProviderHandler.Get)
			llmProviders.PUT("/:id", llmProviderHandler.Update)
			llmProviders.DELETE("/:id", llmProviderHandler.Delete)
			llmProviders.POST("/:id/health", llmProviderHandler.HealthCheck)
		}

		// 知識條目管理
		entries := v1.Group("/entries")
		{
			entries.POST("", entryHandler.Create)
			entries.GET("", entryHandler.List)
			entries.GET("/:id", entryHandler.GetByID)
			entries.PATCH("/:id", entryHandler.Update)
			entries.DELETE("/:id", entryHandler.Delete)

			// 信心度操作
			entries.POST("/:id/confirm", confidenceHandler.Confirm)
			entries.POST("/:id/flag", confidenceHandler.Flag)
			entries.GET("/:id/flags", confidenceHandler.ListFlags)

			// 知識生命週期
			entries.POST("/:id/supersede", lifecycleHandler.Supersede)
			entries.DELETE("/:id/supersede", lifecycleHandler.ClearSupersede)
			entries.GET("/:id/history", lifecycleHandler.GetHistory)

			// LLM 自動分類
			entries.POST("/:id/classify", classifyHandler.Classify)
			entries.POST("/classify-all", classifyHandler.ClassifyAll)
		}

		// 行事曆（F-026c：gcal event → entry 轉換）
		//
		// 此 group 目前只掛 to-entry；F-026b 的 List/GetDay 由另一支 handler 於其 PR 追加。
		calendar := v1.Group("/calendar")
		{
			calendar.POST("/events/:gcal_id/to-entry", calendarConvertHandler.ConvertToEntry)
		}

		// Google Calendar 整合
		integrations := v1.Group("/integrations")
		{
			integrations.POST("/gcal/auth", gcalHandler.StartAuth)
			integrations.GET("/gcal/callback", gcalHandler.Callback)
		}

		// 匯入
		importGroup := v1.Group("/import")
		{
			importGroup.POST("/git", gitImportHandler.Import)
			importGroup.POST("/gcal", gcalHandler.Import)
		}

		// 搜尋
		search := v1.Group("/search")
		{
			search.POST("", searchHandler.SmartSearch)
			search.GET("/simple", searchHandler.SimpleSearch)
		}

		// 統計
		v1.GET("/stats", statsHandler.GetStats)

		// 系統資訊
		system := v1.Group("/system")
		{
			system.GET("/search-config", systemHandler.GetSearchConfig)
		}

		// 行事曆彙整（F-026b）
		calendarGroup := v1.Group("/calendar")
		{
			calendarGroup.GET("", calendarHandler.Aggregate)
			calendarGroup.GET("/days/:date", calendarHandler.GetDay)
		}
	}

	return r
}
