package middleware

import (
	"github.com/gin-gonic/gin"
)

// CORSMiddleware 允許跨網域請求
// 開發環境預設允許所有來源；production 可透過環境變數限制
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin == "" {
			origin = "*"
		}
		c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		c.Writer.Header().Set("Vary", "Origin")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set(
			"Access-Control-Allow-Headers",
			"Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, X-API-Key, X-Timezone",
		)
		c.Writer.Header().Set(
			"Access-Control-Allow-Methods",
			"POST, OPTIONS, GET, PUT, PATCH, DELETE",
		)
		c.Writer.Header().Set("Access-Control-Max-Age", "86400")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
