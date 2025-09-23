// These will be available globally from the scripts in index.html
declare const mammoth: any;
declare const pdfjsLib: any;

export async function parseFile(file: File): Promise<string> {
    if (!file) {
        throw new Error("No file provided for parsing.");
    }
    
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'txt' || file.type === 'text/plain') {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target && typeof event.target.result === 'string') {
                    resolve(event.target.result);
                } else {
                    reject(new Error('Failed to read text file content.'));
                }
            };
            reader.onerror = (error) => reject(new Error(`Error reading text file: ${error}`));
            reader.readAsText(file);
        });
    }

    if (fileExtension === 'docx') {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
            return result.value;
        } catch (error) {
            console.error("Error parsing DOCX file:", error);
            throw new Error("Failed to parse .docx file. It might be corrupted or in an unsupported format.");
        }
    }
    
    if (fileExtension === 'pdf') {
        try {
            // pdfjsLib is loaded via script tag in index.html
            // The workerSrc is crucial for pdf.js to work in a web environment
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            let textContent = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const text = await page.getTextContent();
                // The item can be a TextItem or TextMarkedContent, we only want the string from TextItem
                const pageText = text.items.map(item => ('str' in item ? item.str : '')).join(' ');
                textContent += pageText + '\n';
            }
            return textContent;
        } catch (error) {
            console.error("Error parsing PDF file:", error);
            throw new Error("Failed to parse .pdf file. It might be encrypted or corrupted.");
        }
    }

    // If the function reaches this point, the file type is not supported.
    throw new Error(`Unsupported file type: .${fileExtension}. Please upload a .txt, .pdf, or .docx file.`);
}
