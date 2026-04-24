FROM postgres:16-alpine

# 安裝 pg_bigm 擴展（2-gram 索引，優化中文全文搜尋）
# 使用 with_llvm=no 避免需要 clang 產生 LLVM bitcode
RUN apk add --no-cache build-base postgresql-dev wget \
    && cd /tmp \
    && wget -q https://github.com/pgbigm/pg_bigm/archive/refs/tags/v1.2-20240606.tar.gz \
    && tar xzf v1.2-20240606.tar.gz \
    && cd pg_bigm-1.2-20240606 \
    && make USE_PGXS=1 with_llvm=no \
    && make USE_PGXS=1 with_llvm=no install \
    && cd / && rm -rf /tmp/* \
    && apk del build-base postgresql-dev wget
