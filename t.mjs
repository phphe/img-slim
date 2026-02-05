// 临时转录
import Database from "better-sqlite3";

// 数据库文件路径
const SOURCE_DB_PATH = "./prisma/main.db1"; // 源数据库（main.db1）
const TARGET_DB_PATH = "./prisma/main.db"; // 目标数据库（main.db）

function copyConvertLogTable() {
  let sourceDb = null;
  let targetDb = null;

  try {
    // 1. 打开数据库连接（ES6简洁写法）
    console.log("正在连接数据库...");
    sourceDb = new Database(SOURCE_DB_PATH, { readonly: true }); // 源库只读
    targetDb = new Database(TARGET_DB_PATH, { fileMustExist: true }); // 目标库需存在

    // 2. 读取源表数据（better-sqlite3同步API）
    console.log("开始读取main.db1中的convert_log表数据...");
    const getLogData = sourceDb.prepare("SELECT * FROM convert_log");
    const logData = getLogData.all();

    if (logData.length === 0) {
      console.log("main.db1的convert_log表中无数据，无需复制");
      return;
    }
    console.log(`成功读取到 ${logData.length} 条数据`);

    // 3. 事务化批量插入（ES6箭头函数+forEach）
    console.log("开始向main.db的convert_log表插入数据...");
    const insertTransaction = targetDb.transaction((data) => {
      if (data.length === 0) return;

      // 提取字段名和占位符（ES6数组方法）
      const columns = Object.keys(data[0]).join(",");
      const placeholders = Array.from(
        { length: Object.keys(data[0]).length },
        () => "?",
      ).join(",");

      // 预编译插入语句（提升性能）
      const insertStmt = targetDb.prepare(
        `INSERT INTO ConvertLog (${columns}) VALUES (${placeholders})`,
      );

      // 批量执行（ES6 forEach）
      data.forEach((row) => {
        insertStmt.run(Object.values(row));
      });
    });

    // 执行事务（自动处理BEGIN/COMMIT/ROLLBACK）
    insertTransaction(logData);

    console.log(`✅ 成功插入 ${logData.length} 条数据到main.db的convert_log表`);
  } catch (error) {
    // 错误处理（ES6错误信息提取）
    console.error("❌ 复制数据过程中出错：", error.message);
    throw error;
  } finally {
    // 4. 关闭连接（ES6条件判断）
    if (sourceDb) {
      sourceDb.close();
      console.log("源数据库连接已关闭");
    }
    if (targetDb) {
      targetDb.close();
      console.log("目标数据库连接已关闭");
    }
  }
}

// 执行脚本（ES6 try/catch）
try {
  copyConvertLogTable();
  console.log("🎉 数据复制任务完成！");
  process.exit(0);
} catch (err) {
  console.log("💥 数据复制任务失败！");
  process.exit(1);
}
