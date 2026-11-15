/**
 * The uploaded PDF, kept in this tab's memory so the results page can show the real document.
 * The backend deletes uploads after analysis (privacy), so nothing is stored anywhere else.
 * After a page reload the file is gone and the results page falls back to the extracted text.
 */
const files = new Map<string, File>();

export const rememberFile = (analysisId: string, file: File) => files.set(analysisId, file);
export const recallFile = (analysisId: string): File | undefined => files.get(analysisId);
