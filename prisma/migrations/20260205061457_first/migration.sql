-- CreateTable
CREATE TABLE "ConvertLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "path" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "type_converted" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "size" INTEGER,
    "quality" TEXT,
    "width_converted" INTEGER,
    "height_converted" INTEGER,
    "size_converted" INTEGER,
    "quality_converted" TEXT,
    "result" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT
);
