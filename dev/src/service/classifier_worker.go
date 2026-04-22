package service

import (
	"context"
	"log/slog"
	"sync"

	"github.com/google/uuid"
)

const (
	// classificationQueueSize 分類佇列大小
	classificationQueueSize = 100
)

// ClassifierWorker 背景分類 worker
type ClassifierWorker struct {
	classifierSvc *ClassifierService
	taskCh        chan uuid.UUID
	wg            sync.WaitGroup
	ctx           context.Context
	cancel        context.CancelFunc
}

// NewClassifierWorker 建立新的 ClassifierWorker
func NewClassifierWorker(classifierSvc *ClassifierService) *ClassifierWorker {
	ctx, cancel := context.WithCancel(context.Background())
	return &ClassifierWorker{
		classifierSvc: classifierSvc,
		taskCh:        make(chan uuid.UUID, classificationQueueSize),
		ctx:           ctx,
		cancel:        cancel,
	}
}

// Start 啟動背景 worker goroutine
func (w *ClassifierWorker) Start() {
	w.wg.Add(1)
	go func() {
		defer w.wg.Done()
		slog.Info("分類 worker 已啟動")
		for {
			select {
			case entryID := <-w.taskCh:
				slog.Info("開始背景分類", "entry_id", entryID)
				if err := w.classifierSvc.ClassifyEntry(w.ctx, entryID); err != nil {
					slog.Error("背景分類失敗",
						"entry_id", entryID,
						"error", err,
					)
				} else {
					slog.Info("背景分類完成", "entry_id", entryID)
				}
			case <-w.ctx.Done():
				slog.Info("分類 worker 收到關閉信號")
				return
			}
		}
	}()
}

// Enqueue 將 entry 加入分類佇列（非阻塞）
func (w *ClassifierWorker) Enqueue(entryID uuid.UUID) {
	select {
	case w.taskCh <- entryID:
		slog.Info("entry 已加入分類佇列", "entry_id", entryID)
	default:
		slog.Warn("分類佇列已滿，跳過", "entry_id", entryID)
	}
}

// Shutdown 優雅關閉 worker
func (w *ClassifierWorker) Shutdown() {
	slog.Info("正在關閉分類 worker...")
	w.cancel()
	w.wg.Wait()
	slog.Info("分類 worker 已關閉")
}
