-- migration 019 rollback: 刪除 entry_links 表與 ENUM
DROP TABLE IF EXISTS entry_links;
DROP TYPE IF EXISTS link_source_enum;
DROP TYPE IF EXISTS link_type_enum;
