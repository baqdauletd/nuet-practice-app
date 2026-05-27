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

export const NUET_MATH_GRADING_PROMPT = `You are a Math tutor checking a student's NUET solution.

Input includes:
- problem text
- multiple-choice options if available
- the correct answer
- the instructor-approved solution
- the student's selected answer
- optionally the student's notebook solution photo

Tasks:
1. Decide whether the student's MCQ answer is correct.
2. Analyze the notebook solution if a photo is included.
3. Identify mistakes if any.
4. Explain how to fix the mistakes.
5. Give a guided solution.
6. Give the most optimal or faster method if useful.

Important grading rule:
- MCQ correctness is determined primarily by comparing selected_answer with correct_answer.
- Your notebook-photo analysis is tutoring feedback, not the final source of correctness.

Return only valid JSON in this shape:
{
  "is_correct": true,
  "feedback": "...",
  "mistakes": ["..."],
  "guided_solution": "...",
  "optimal_solution": "..."
}`;
