'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';

const GRID_SIZE = 9;

export default function Home() {
  const [board, setBoard] = useState<string[][]>(
    Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill('.'))
  );
  const [solvedBoard, setSolvedBoard] = useState<string[][] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[][]>(
    Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null))
  );

  // Focus first empty cell on load
  useEffect(() => {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (board[r][c] === '.') {
          inputRefs.current[r]?.[c]?.focus();
          return;
        }
      }
    }
  }, []); // Run only once on mount

  const handleInputChange = (row: number, col: number, value: string) => {
    const sanitizedValue = value.match(/^[1-9]$/) ? value : '.';
    const newBoard = board.map((r, rowIndex) =>
      r.map((cell, colIndex) => {
        if (rowIndex === row && colIndex === col) {
          return sanitizedValue;
        }
        return cell;
      })
    );
    setBoard(newBoard);
    setSolvedBoard(null);
    setError(null);
    setVerificationUrl(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, row: number, col: number) => {
    let nextRow = row;
    let nextCol = col;

    switch (e.key) {
      case 'ArrowUp':
        nextRow = row > 0 ? row - 1 : GRID_SIZE - 1;
        e.preventDefault(); // Prevent default scrolling
        break;
      case 'ArrowDown':
        nextRow = row < GRID_SIZE - 1 ? row + 1 : 0;
        e.preventDefault();
        break;
      case 'ArrowLeft':
        nextCol = col > 0 ? col - 1 : GRID_SIZE - 1;
        // Move to previous row if at the beginning of a row
        if (col === 0) nextRow = row > 0 ? row - 1 : GRID_SIZE - 1;
        e.preventDefault();
        break;
      case 'ArrowRight':
        nextCol = col < GRID_SIZE - 1 ? col + 1 : 0;
        // Move to next row if at the end of a row
        if (col === GRID_SIZE - 1) nextRow = row < GRID_SIZE - 1 ? row + 1 : 0;
        e.preventDefault();
        break;
      case 'Backspace':
      case 'Delete':
         // Clear current cell and move left if it was already empty
         if (board[row][col] === '.') {
            nextCol = col > 0 ? col - 1 : GRID_SIZE - 1;
            if (col === 0) nextRow = row > 0 ? row - 1 : GRID_SIZE - 1;
         } else {
            // Just clear the cell, don't move focus immediately
            handleInputChange(row, col, ''); // Use empty string which becomes '.'
            // Keep focus on the current cell after clearing
            nextRow = row;
            nextCol = col;
         }
         e.preventDefault();
         break;
      default:
        // If typing a number, move right after input
        if (/^[1-9]$/.test(e.key)) {
            // Allow the input change to happen first
            setTimeout(() => {
                let nextFocusCol = col < GRID_SIZE - 1 ? col + 1 : 0;
                let nextFocusRow = row;
                if (col === GRID_SIZE - 1) nextFocusRow = row < GRID_SIZE - 1 ? row + 1 : 0;
                inputRefs.current[nextFocusRow]?.[nextFocusCol]?.focus();
                inputRefs.current[nextFocusRow]?.[nextFocusCol]?.select();
            }, 0);
        }
        return; // Don't change focus for other keys
    }

    // Focus the next input element
    inputRefs.current[nextRow]?.[nextCol]?.focus();
    inputRefs.current[nextRow]?.[nextCol]?.select(); // Select text for easy overwriting
  };

  const handleClear = () => {
    setBoard(Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill('.')));
    setSolvedBoard(null);
    setError(null);
    setVerificationUrl(null);
    inputRefs.current[0]?.[0]?.focus(); // Focus first cell after clearing
  };

  const handleSolve = async () => {
    setIsLoading(true);
    setError(null);
    setSolvedBoard(null);
    setVerificationUrl(null);

    try {
      const response = await fetch('/api/solve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ board }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Use the error message from the API response
        throw new Error(data.error || `Failed to solve the puzzle (Status: ${response.status})`);
      }

      setSolvedBoard(data.solvedBoard);
      const verifyUrl = 'https://sudoku.com/';
      setVerificationUrl(verifyUrl);

    } catch (err) {
      console.error('Error solving sudoku:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const renderBoard = (boardData: string[][], isInput: boolean) => {
    return (
      <div className="grid grid-cols-9 gap-0 border-2 border-gray-700 w-fit mx-auto shadow-lg">
        {boardData.map((row, rowIndex) => (
          row.map((cell, colIndex) => {
            const isThickRight = (colIndex + 1) % 3 === 0 && colIndex < GRID_SIZE - 1;
            const isThickBottom = (rowIndex + 1) % 3 === 0 && rowIndex < GRID_SIZE - 1;
            const borderClasses = `
              border border-gray-300
              ${isThickRight ? 'border-r-2 border-r-gray-700' : ''}
              ${isThickBottom ? 'border-b-2 border-b-gray-700' : ''}
              ${colIndex === 0 ? 'border-l-2 border-l-gray-700' : ''}
              ${rowIndex === 0 ? 'border-t-2 border-t-gray-700' : ''}
              ${colIndex === GRID_SIZE - 1 ? 'border-r-2 border-r-gray-700' : ''}
              ${rowIndex === GRID_SIZE - 1 ? 'border-b-2 border-b-gray-700' : ''}
            `;
            // Determine text color: blue for input, black for solved/readonly
            const textColor = isInput ? 'text-blue-700' : 'text-black';

            return (
              <input
                key={`${rowIndex}-${colIndex}`}
                ref={el => { if (inputRefs.current[rowIndex]) inputRefs.current[rowIndex][colIndex] = el; }}
                type="text" // Use text to handle single digit input easily
                inputMode="numeric" // Hint for mobile keyboards
                pattern="[1-9]" // Pattern for validation (though JS handles it)
                maxLength={1}
                value={cell === '.' ? '' : cell}
                onChange={(e) => isInput && handleInputChange(rowIndex, colIndex, e.target.value)}
                onKeyDown={(e) => isInput && handleKeyDown(e, rowIndex, colIndex)}
                readOnly={!isInput}
                className={`w-10 h-10 sm:w-12 sm:h-12 text-center text-xl sm:text-2xl font-bold ${borderClasses} ${textColor} ${!isInput ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:bg-blue-50 focus:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500'}`}
                aria-label={`Cell R${rowIndex + 1}C${colIndex + 1}`}
              />
            );
          })
        ))}
      </div>
    );
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-12 bg-gradient-to-br from-gray-100 to-gray-200">
      <div className="bg-white p-6 sm:p-10 rounded-lg shadow-xl max-w-max">
        <h1 className="text-3xl sm:text-4xl font-bold mb-6 sm:mb-8 text-center text-gray-800">Sudoku Solver Verifier</h1>

        <p className="mb-4 text-center text-gray-600">Enter the Sudoku puzzle below (use numbers 1-9, leave cells empty for blank cells):</p>

        {renderBoard(board, true)}

        <div className="flex flex-wrap justify-center gap-4 mt-6 sm:mt-8">
          <button
            onClick={handleSolve}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 shadow-md hover:shadow-lg"
          >
            {isLoading ? (
                <svg className="animate-spin h-5 w-5 mr-3 inline-block" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : null}
            {isLoading ? 'Solving...' : 'Solve'}
          </button>
          <button
            onClick={handleClear}
            disabled={isLoading}
            className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 shadow-md hover:shadow-lg"
          >
            Clear
          </button>
        </div>

        {error && (
          <p className="mt-6 text-center text-red-600 font-semibold bg-red-100 p-3 rounded-md border border-red-300">Error: {error}</p>
        )}

        {solvedBoard && (
          <div className="mt-8 sm:mt-10 border-t pt-6 border-gray-200">
            <h2 className="text-2xl font-semibold mb-4 text-center text-gray-800">Solved Puzzle:</h2>
            {renderBoard(solvedBoard, false)}

            <div className="flex flex-wrap justify-center gap-4 mt-6">
              {verificationUrl && (
                <a
                  href={verificationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition duration-200 shadow-md hover:shadow-lg inline-block"
                >
                  Verify on sudoku.com
                </a>
              )}
            </div>

            <p className="mt-4 text-center text-gray-600">
              To verify the solution, go to sudoku.com and enter the numbers to confirm they are correct.
            </p>
          </div>
        )}

        <p className="mt-8 text-xs text-gray-500 text-center">
          This tool uses a Go-based Sudoku solver to find the solution. You can then verify it against sites like sudoku.com.
        </p>
      </div>
    </main>
  );
}
