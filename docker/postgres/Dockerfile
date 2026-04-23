FROM postgres:16-alpine

# 安裝 pg_bigm 擴展（2-gram 索引，優化中文全文搜尋）
RUN apk add --no-cache build-base postgresql-dev wget \
    && cd /tmp \
    && wget -q https://github.com/pgbigm/pg_bigm/archive/refs/tags/v1.2-20240606.tar.gz \
    && tar xzf v1.2-20240606.tar.gz \
    && cd pg_bigm-1.2-20240606 \
    && make USE_PGXS=1 \
    && make USE_PGXS=1 install \
    && cd / && rm -rf /tmp/* \
    && apk del build-base postgresql-dev wget
