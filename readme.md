# Sudoku Solver Verifier - Audit Documentation

## 1. Project Overview

This project aims to create a web application that serves as a verification tool for a Sudoku solver program written in Go. The primary goal is to allow a user (specifically for an audit presentation at 01 Talent Academy) to input a Sudoku puzzle, have it solved by the provided Go solver, and then easily verify the correctness of the generated solution against an external source like sudoku.com.

The application consists of a frontend user interface built with Next.js and a backend component that utilizes the user-provided Go Sudoku solver.

## 2. Go Sudoku Solver (`solver.go`)

The core logic for solving Sudoku puzzles resides in the `solver.go` program provided by the student. Key aspects of this solver include:

*   **Algorithm**: It employs a standard backtracking algorithm to find a valid solution for a given 9x9 Sudoku grid.
*   **Input**: The program expects the Sudoku puzzle to be provided as 9 separate command-line arguments, where each argument is a string representing a row. Empty cells are represented by the character "." (dot), and filled cells contain digits from "1" to "9".
*   **Validation**: The Go program includes validation to check if the input arguments are correctly formatted (9 rows, 9 characters each, valid characters) and if the initial board configuration adheres to Sudoku rules (no duplicate numbers in rows, columns, or 3x3 subgrids).
*   **Output**: If a solution is found, the program prints the solved 9x9 grid to standard output, with numbers in each row separated by spaces and rows separated by newlines. If no solution is found or the initial board is invalid, it prints an error message to standard output and exits with a non-zero status code.
*   **Compilation for Vercel**: For deployment, the Go program was cross-compiled for the Linux AMD64 environment (`GOOS=linux GOARCH=amd64`), which is the standard environment used by Vercel serverless functions. The resulting executable is named `solver` and is included in the project root.

## 3. Web Interface (Next.js - `src/app/page.tsx`)

The frontend provides an interactive user interface for interacting with the solver:

*   **Framework**: Built using Next.js (React framework).
*   **UI Components**:
    *   **Input Grid**: A 9x9 grid of input fields allows the user to enter the Sudoku puzzle. Input numbers are displayed in blue.
    *   **Navigation**: Users can navigate between cells using the arrow keys. Typing a number automatically moves the focus to the next cell.
    *   **Solve Button**: Triggers the solving process by sending the current board state to the backend API.
    *   **Clear Button**: Resets the input grid to an empty state.
    *   **Solved Grid**: Displays the solution returned by the solver. Solved numbers are displayed in black in read-only fields.
    *   **Error Display**: Shows any errors returned from the solver API (e.g., invalid input, no solution found).
    *   **Verification Link**: Provides a link to sudoku.com for manual verification of the solution.
*   **Styling**: Tailwind CSS is used for styling the components.

## 4. Integration (API Route - `src/app/api/solve/route.ts`)

The Next.js frontend communicates with the Go solver through a serverless API route defined in `src/app/api/solve/route.ts`:

*   **Endpoint**: Handles POST requests to `/api/solve`.
*   **Request**: Expects a JSON payload containing the `board` as a 9x9 array of strings (digits "1"-"9" or "." for empty cells).
*   **Processing**:
    1.  Validates the incoming board data structure and characters.
    2.  Formats the board data into the 9 command-line arguments required by the Go solver.
    3.  Executes the pre-compiled Go solver binary (`solver`) located in the project root using Node.js `child_process.exec`.
    4.  Captures the standard output (stdout) and standard error (stderr) from the Go program.
*   **Response**:
    *   **Success**: If the solver executes successfully and returns a valid solved grid on stdout, the API parses the output into a 9x9 array and returns it as JSON with a 200 OK status.
    *   **Solver Error**: If the Go program exits with an error (e.g., invalid input board, no solution found) and prints an error message to stdout/stderr, the API returns this error message as JSON with a 400 Bad Request status.
    *   **Execution/Other Error**: If there's an issue executing the binary or any other server-side error occurs, the API returns an appropriate error message with a 500 Internal Server Error status.

## 5. Verification Process

The application facilitates the verification of the Go solver's correctness as follows:

1.  **Input**: The user obtains a Sudoku puzzle from a source like sudoku.com and enters it into the web application's input grid.
2.  **Solve**: The user clicks the "Solve" button.
3.  **Execution**: The frontend sends the puzzle to the backend API, which executes the compiled Go solver (`solver`).
4.  **Display**: The web application displays the solved grid returned by the Go program.
5.  **Manual Verification**: The user clicks the "Verify on sudoku.com" link. They can then manually input the *original* puzzle and the *solved* numbers into sudoku.com (or a similar verification tool) to confirm that the solution generated by the Go program is indeed correct according to the rules of Sudoku.

## 6. Deployment (Vercel)

The application is prepared for deployment on Vercel:

*   **Go Binary**: The `solver` executable (compiled for Linux AMD64) is included in the project root and is executed by the API route.
*   **Vercel Configuration (`vercel.json`)**: A `vercel.json` file is included to configure the build process (using `npm run build`) and specify the Next.js framework.
*   **Deployment Steps (Manual)**: Since direct deployment from this environment isn't possible without Vercel account access, the user can deploy using one of these methods:
    1.  **Vercel CLI**: Install the Vercel CLI (`npm i -g vercel`), navigate to the project directory (extracted from the provided zip file), and run the `vercel` command. Follow the prompts to link and deploy the project.
    2.  **GitHub/GitLab/Bitbucket Integration**: Upload the project source code (from the zip file) to a Git repository. Connect this repository to Vercel through the Vercel dashboard. Vercel will automatically detect the Next.js project, build it (including the Go binary in the serverless function), and deploy it.

## 7. Source Code

The complete source code for this project, including the Next.js application, the Go solver source (`solver.go`), the compiled Linux binary (`solver`), and configuration files (`package.json`, `vercel.json`), is provided in the `sudoku_source_code.zip` archive attached to the message.

