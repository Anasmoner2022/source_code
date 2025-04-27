import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execPromise = promisify(exec);
// Assume the 'solver' executable is in the project root after the build step
// Vercel copies project files into the serverless function environment.
// process.cwd() should point to the root of the serverless function.
// Let's try referencing the solver from the root.
const solverPath = path.resolve(process.cwd(), 'solver');

export async function POST(request: NextRequest) {
  try {
    const { board } = await request.json();

    // Validate board structure
    if (!board || !Array.isArray(board) || board.length !== 9 || !board.every(row => Array.isArray(row) && row.length === 9)) {
      return NextResponse.json(
        { error: 'Invalid board format. Expected 9x9 array.' },
        { status: 400 }
      );
    }

    // Convert board to format expected by Go solver and validate characters
    const goArgs: string[] = [];
    for (const row of board) {
        const rowStr = row.map(cell => (cell === '' || cell === null || cell === undefined) ? '.' : String(cell)).join('');
        if (!/^[1-9.]{9}$/.test(rowStr)) {
            // Return 400 for invalid input characters
            return NextResponse.json(
                { error: `Invalid characters in input row: ${rowStr}. Only 1-9 and . (or empty) allowed.` },
                { status: 400 }
            );
        }
        goArgs.push(rowStr);
    }

    // Execute the pre-built Go solver binary
    const solveCommand = `${solverPath} ${goArgs.map(arg => `"${arg}"`).join(' ')}`;

    try {
        // Execute the compiled solver
        // Note: Ensure the execution environment has permissions and the binary is compatible (linux/amd64 usually for Vercel)
        const { stdout } = await execPromise(solveCommand);

        // Parse solver output
        const solvedRows = stdout.trim().split('\n');

        // Check if output format is correct (9 rows, each with 9 space-separated digits)
        if (solvedRows.length !== 9 || !solvedRows.every(row => /^[1-9]( [1-9]){8}$/.test(row.trim()))) {
            console.error('Solver returned invalid output format:', stdout);
             // If the output contains a known error message from the solver, return it
            if (stdout.includes("Error:")) {
                 return NextResponse.json({ error: stdout.trim() }, { status: 400 }); // Bad request if input leads to solver error
            }
            // Otherwise, it's an unexpected format issue
            return NextResponse.json(
                { error: 'Solver returned invalid output format.' },
                { status: 500 }
            );
        }

        // Format the solved board correctly
        const solvedBoard = solvedRows.map(row =>
            row.trim().split(' ')
        );

        // Return the successfully solved board
        return NextResponse.json({ solvedBoard });

    } catch (solverError: any) {
        // Handle errors specifically from the Go solver execution (e.g., exit code 1)
        console.error('Solver execution error:', solverError);

        // Extract the error message from the Go program's output (stdout often contains the error message for exit 1)
        let errorMessage = 'Failed to solve the puzzle.';
        if (solverError.stdout && solverError.stdout.trim()) {
            errorMessage = solverError.stdout.trim();
        } else if (solverError.stderr && solverError.stderr.trim()) {
            // Include stderr if stdout is empty
            errorMessage = solverError.stderr.trim();
        }
        // Check if binary exists
        if (solverError.message && solverError.message.includes('ENOENT')){
             errorMessage = `Solver executable not found at ${solverPath}. Check build process.`;
        }


        // Return the error message from the solver
        // Use 400 status code if the solver indicated an issue with the input (like invalid initial board)
        // Use 500 for other unexpected execution errors
        const statusCode = errorMessage.includes("Initial board configuration is invalid") || errorMessage.includes("No solution found") ? 400 : 500;
        return NextResponse.json({ error: errorMessage }, { status: statusCode });
    }

  } catch (error) {
    // Catch any other unexpected errors (e.g., JSON parsing errors)
    console.error('General API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected server error occurred.' },
      { status: 500 }
    );
  }
}

