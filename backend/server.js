// Expense Tracker - backend (Express API + PostgreSQL)
//
// PHASE 1
// Setup:
//   1. Create a database named expense_tracker and run schema.sql on it.
//   2. Copy .env.example to a new file named .env and write your PostgreSQL password.
//   3. npm install express cors pg dotenv
// Run:    node server.js   (restart it every time you change this file)
//
// Endpoints you need to build:
//   GET    /api/expenses        return all expenses
//   GET    /api/expenses/:id    return one expense (404 if not found)
//   POST   /api/expenses        add an expense (201, or 400 if the data is invalid)
//   PUT    /api/expenses/:id    update an expense (200, 400, or 404)
//   DELETE /api/expenses/:id    delete an expense (200, or 404)
//
// Tips:
//   - Create one Pool (from the "pg" library) with the values from .env,
//     and use pool.query(...) in every route.
//   - ALWAYS send the values as parameters: pool.query("... WHERE id = $1", [id]).
//     NEVER build the SQL text by joining strings with data from the user.
//   - Use RETURNING to get the new (or updated) row back from INSERT and UPDATE.
//   - The database creates the id. The client never sends one.
//   - pg returns NUMERIC as text and DATE as a JavaScript Date, so fix both in your SELECT.
//     Hint: amount::float8 and to_char(date, 'YYYY-MM-DD').
//   - Validate the data before the query, and answer 400 with a message that explains the problem.
//   - Check the id before the query. A text like "abc" makes PostgreSQL throw an error.
//   - Enable CORS so the frontend can talk to the server.
//   - Test every endpoint with Thunder Client BEFORE you connect the frontend.

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const {Pool} = require("pg");

const app = express();

app.use(cors());
app.use(express.json());

const pool = new Pool(
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD
    }
);

// GET ALL EXPENSES
app.get("/api/expenses", async (req, res) => {

    const {search, category, from, to, sort, page="1", limit ="10"} = req.query;
    const conditions = [];
    const values = [];
    let sortQuery = "id ASC";
    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    if(
        !Number.isInteger(pageNumber) ||
        pageNumber <= 0 ||
        !Number.isInteger(limitNumber) ||
        limitNumber <= 0
    ) {
        return res.status(400).json({
            message: "Page and limit must be positive integers"
        });
    }

    const offset = (pageNumber - 1)* limitNumber;

    if(search){
        conditions.push("title ILIKE $1");
        values.push(`%${search}%`);
    }

    if(category) {
        conditions.push(`category = $${values.length +1}`);
        values.push(category);
    }

    if(from) {
        conditions.push(`date >= $${values.length +1}`);
        values.push(from);
    }

    if (to) {
        conditions.push(`date <= $${values.length +1}`);
        values.push(to);
    }

    if(sort){
        switch (sort) {
            case "amount_asc":
                sortQuery = "amount ASC";
                break;

            case "amount_desc":
                sortQuery = "amount DESC";
                break;

            case "date_asc":
                sortQuery = "date ASC";
                break;

            case "date_desc":
                sortQuery = "date DESC";
                break;
        }
    }
    
    const filterValues= [...values]

    const limitParam = values.length +1 ;
    const offsetParam = values.length +2;

    values.push(limitNumber, offset);

    const whereClause = conditions.length > 0
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

    try {
        const result = await pool.query(
        `
        SELECT
            id,
            title,
            amount::float8 AS amount,
            category,
            to_char(date, 'YYYY-MM-DD') AS date
        FROM expenses
        ${whereClause}
        ORDER BY ${sortQuery}
        LIMIT $${limitParam}
        OFFSET $${offsetParam}
        `,
        values
        );

        const countResult = await pool.query(
            `
            SELECT COUNT(*)
            FROM expenses
            ${whereClause}
            `,
            filterValues
        );

        const total = Number(countResult.rows[0].count);

        res.json({
            data: result.rows,
            page: pageNumber,
            limit: limitNumber,
            total: total
        });
    } 
    catch (error) {
        console.error(error);

        res.status(500).json({
        message: "Internal server error"
        });
    }
});

// GET CATEGORIES
app.get("/api/expenses/categories", async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT DISTINCT category
            FROM expenses
            ORDER BY category
            `
        );

        res.json(result.rows);
    }
    catch(error){
        console.error(error);

        res.status(500).json({
            message: "Internal server error"
        });
    }
});

// GET STATS
app.get("/api/expenses/stats", async (req , res) => {
    try {
        const result = await pool.query(
            `
            SELECT 
                COUNT (*) AS total_expenses,
                SUM(amount) AS total_amount,
                AVG(amount) AS average_amount,
                MAX(amount) AS highest_expense
            FROM expenses
            `
        );

        res.json({
            totalExpenses: Number(result.rows[0].total_expenses),
            totalAmount: Number(result.rows[0].total_amount),
            averageAmount: Number(result.rows[0].average_amount),
            highestExpenses: Number(result.rows[0].highest_expense)
        });
    }
    catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Internal server error"
        });
    }
});

// GET CATEGORY STATS
app.get("/api/expenses/stats/categories", async (req , res) => {
    try{
        const result = await pool.query(
            `
            SELECT 
                category,
                COUNT(*) AS total_expenses,
                SUM(amount) AS total_amount
            FROM expenses
            GROUP BY category
            ORDER BY category
            `
        );

        res.json(
        result.rows.map(row => ({
            category: row.category,
            totalExpenses: Number(row.total_expenses),
            totalAmount: Number(row.total_amount)
        }))
    );

    }
    catch(error){
        console.error(error);

        res.status(500).json({
            message: "Internal server error"
        });
    }
});

// GET MONTHLY STATS
app.get("/api/expenses/stats/monthly", async (req, res) => {
    try {
        const result = await pool.query(
        `
        SELECT
            TO_CHAR(date, 'YYYY-MM') AS month,
            COUNT(*) AS total_expenses,
            SUM(amount) AS total_amount
        FROM expenses
        GROUP BY TO_CHAR(date, 'YYYY-MM')
        ORDER BY month
        `
    );

    res.json(
    result.rows.map(row => ({
        month: row.month,
        totalExpenses: Number(row.total_expenses),
        totalAmount: Number(row.total_amount)
        }))
    );
    }
    catch(error){
        console.error(error);

        res.status(500).json({
            message: "Internal server error"
        });
    }
});

// GET EXPENSE BY ID
app.get("/api/expenses/:id", async (req , res) => {
    const {id} = req.params;
    const expenseId = Number(id);

    if(!Number.isInteger(expenseId) || expenseId <= 0) {
        return res.status(400).json({
            message: "ID must be a positive integer"
        });
    }

    try{
        const result = await pool.query(
        `
        SELECT
            id,
            title,
            amount::float8 AS amount,
            category,
            to_char(date, 'YYYY-MM-DD') AS date
        FROM expenses
        WHERE id = $1
        `,
        [expenseId]
    );
        if(result.rows.length === 0){
            return res.status(404).json({
            message: "Expense not found"
            });
        }
        res.json(result.rows[0]);
    }
    catch (error){
        console.error(error);

        res.status(500).json({
            message: "Internal server error"
        });
    }

    
});

// CREATE EXPENSE
app.post("/api/expenses", async (req , res) => {
    const {title, amount, category, date} = req.body;

    if (!title || amount === undefined || !category || !date){
        return res.status(400).json({
            message: "All fields are required"
        });
    }

    if (typeof amount !== "number" || amount <=0 ){
        return res.status(400).json({
        message: "Amount must be a positive number"
        });
    }

    if (typeof title !== "string" || title.trim().length === 0 || title.length > 100){
        return res.status(400).json({
            message: "Title must be a non-empty string with maximum 100 characters"
        });
    }

    if (typeof category !== "string" || category.trim().length === 0 || category.length > 20){
        return res.status(400).json({
            message: "Category must be a non-empty string with maximum 20 characters"
        });
    }

    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)){
        return res.status(400).json({
            message: "Date must be in YYYY-MM-DD format"
        });
    }

    try {
        const result = await pool.query(
            `
            INSERT INTO expenses (title, amount, category, date)
            VALUES ($1, $2, $3, $4)
            RETURNING
            id,
            title,
            amount::float8 AS amount,
            to_char(date, 'YYYY-MM-DD')AS date,
            category
            `,
            [title, amount, category, date]
        );
        
        res.status(201).json(result.rows[0]);
    }
    catch(error) {
        console.error(error);

        res.status(500).json({
            message: "Internal server error"
        });
    }


});

// UPDATE EXPENSE
app.put("/api/expenses/:id", async (req , res) => {
    const {id} = req.params;
    const expenseId = Number(id);

    if (!Number.isInteger(expenseId) || expenseId <= 0){
        return res.status(400).json({
            message: "ID must be a positive integer"
        });
    }

    const {title, amount, category, date} = req.body;

    if (!title || amount === undefined || !category || !date) {
        return res.status(400).json({
            message: "All fields are required"
        });
    }

    if (typeof amount !== "number" || amount <= 0) {
        return res.status(400).json({
            message: "Amount must be a positive number"
        });
    }

    if (typeof title !== "string" || title.trim().length === 0 || title.length > 100){
        return res.status(400).json({
            message: "Title must be a non-empty string with maximum 100 characters"
        });
    }

    if (typeof category !== "string" || category.trim().length === 0 || category.length > 20){
        return res.status(400).json({
            message: "Category must be a non-empty string with maximum 20 characters"
        });
    }

    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)){
        return res.status(400).json({
            message: "Date must be in YYYY-MM-DD format"
        });
    }

    try{
        const result = await pool.query(
            `
            UPDATE expenses
            SET
                title = $1,
                amount = $2,
                category = $3,
                date = $4
            WHERE id = $5
            RETURNING
            id,title,
            amount::float8 AS amount,
            to_char(date, 'YYYY-MM-DD') AS date,
            category
            `,
            [title,amount,category,date,expenseId]
        );

        if(result.rows.length === 0){
            return res.status(404).json({
                message: "Expense not found"
            });
        }
        
        res.json(result.rows[0]);
    }
    catch(error){
        console.error(error);
        
        res.status(500).json({
            message: "Internal server error"
        });
    }

});


// DELETE EXPENSE BY ID
app.delete("/api/expenses/:id", async (req , res) =>{
    const {id} = req.params;
    const expenseId = Number(id);

    if (!Number.isInteger(expenseId) || expenseId <= 0){
        return res.status(400).json({
            message: "ID must be a positive integer"
        });
    }

    try{
        const result = await pool.query(
            `
        DELETE FROM expenses
        WHERE id = $1
        RETURNING
        id,
        title,
        amount::float8 AS amount,
        to_char(date, 'YYYY-MM-DD') AS date,
        category
        `,
        [expenseId]
        );

        if(result.rows.length === 0){
            return res.status(404).json({
                message: "Expense not found"
            });
        }

        res.json(result.rows[0]);
    }
    catch(error){
        console.error(error);

        res.status(500).json({
            message: "Internal server error"
        });
    }
});


const PORT = 3000;
app.listen(PORT,() => {
    console.log(`Server running on http://localhost:${PORT}`);
})






















