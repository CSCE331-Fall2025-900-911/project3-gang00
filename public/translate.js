// This is the frontend file that would get the data from the webpage and transit them to the backend server
// The code need collect all text data and node in the DOM and skip the text that has 'data-i18n-ignor' label
// After deduplicating the text, group it into an array and POST it to the backend in one go.
// Backfill: Rewrite the translated text returned by the backend in the original position according to the order you sent it; update <html lang="…">