CREATE TABLE itineraries (
    id TEXT PRIMARY KEY,        -- 行程唯一ID (可以用 UUID)
    current_version INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE itinerary_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    itinerary_id TEXT,
    version_number INTEGER,
    content TEXT,               -- 存储行程的 JSON 字符串
    change_summary TEXT,        -- 记录这一版改了什么（比如："用户删除了XXX"）
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (itinerary_id) REFERENCES itineraries(id)
);