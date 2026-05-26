export const NUET_MATH_EXTRACTION_PROMPT = `You are extracting Math multiple-choice problems from a NUET test file.

Rules:
- Extract only Math problems.
- Ignore Biology, Physics, Chemistry, Reading, and non-Math sections.
- Preserve the original question wording as closely as possible.
- Preserve MCQ choices exactly when they are visible.
- If the correct answer is visible, include it.
- If the correct answer is not visible, solve the problem and provide the most likely answer.
- Include a clear solution explanation for each extracted problem.
- Return only valid JSON.

Return JSON in this shape:
{
  "problems": [
    {
      "question_text": "...",
      "choices": {
        "A": "...",
        "B": "...",
        "C": "...",
        "D": "..."
      },
      "correct_answer": "A",
      "solution": "...",
      "difficulty": "easy",
      "source_page": 1
    }
  ]
}

If no Math problems are present, return:
{
  "problems": []
}`;
