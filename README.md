# NUET Practice App

Private math practice for NUET preparation, built for one workflow:

- instructors upload problem sets
- AI extracts structured multiple-choice problems
- instructors review, edit, approve, and assign them
- students solve assigned work in focused daily sessions
- results stay locked until a full session is submitted
- AI then generates grading feedback and guided solutions

The app is designed for small, private teacher-student cohorts rather than open self-serve learning.

## Highlights

- Instructor and student workspaces with persistent GPT-style sidebars
- Multi-file instructor uploads grouped as one problem set
- AI extraction of math problems from PDFs and images
- Instructor approval and editing flow before problems become assignable
- File-based assignment model for connected students
- Whole-file practice sessions and custom sessions from a selected file
- Session gating: results stay hidden until every problem is submitted
- Multi-photo student submissions for handwritten solutions
- AI grading feedback with guided solutions after session completion
- Problem source-image support for visual-reference questions

## Product Flow

### Instructor

1. Upload one or more files as a problem set
2. Run extraction
3. Review extracted problems
4. Approve or edit problems
5. Connect students
6. Assign entire files or selected approved problems
7. Review completed student sessions, answers, photos, correctness, and AI feedback

### Student

1. Accept instructor connection requests
2. Open assigned instructor files
3. Start a session from assigned file content
4. Solve MCQs and upload one or more notebook photos per problem
5. Submit the whole session
6. Generate and review AI feedback after the session is complete

## Core Features

### Problem Extraction

- Accepts `PDF`, `PNG`, `JPG`, `JPEG`, and `WEBP`
- Uses Gemini to extract:
  - question text
  - answer choices
  - correct answer
  - solution
  - difficulty
  - source page
  - visual-reference flag
- Stores extracted problems in a review queue until approved

### Assignment Model

- Problems are organized by uploaded file
- Instructors assign by file or by selected approved problems
- Students only see assigned problems
- If new problems are assigned into a file with an ongoing file-based session, they can be merged into that same session flow

### Session Model

- Students start sessions from assigned file content
- Whole-file sessions are available when the assigned file stays within the configured size rules
- Custom file sessions allow choosing an exact number of problems
- Selection logic keeps the unused-first / longest-ago-used behavior available where needed

### Review Experience

- Students and instructors can:
  - view uploaded solution photos
  - switch between full and compact photo sizes
  - rotate photos in-place
- Results view includes:
  - correctness
  - mistakes
  - guided solution
  - uploaded handwritten work

## Tech Stack

- `Next.js 16`
- `React 19`
- `TypeScript`
- `Tailwind CSS 4`
- `InsForge`
  - auth
  - database
  - storage
- `Gemini`
  - problem extraction
  - grading feedback
- `OpenRouter`
  - configured as a server dependency for AI-related backend work

## App Structure

```text
src/
  app/
    api/
      extract-problems/
      instructor/
      student/
    instructor/
      students/
      uploads/
      review/
      account/
    student/
      practice/
      instructors/
      sessions/
      account/
  components/
    instructor/
    student/
    shared/
  lib/
    ai/
    auth/
    connections/
    problems/
    student-sessions/
    test-uploads/
```

## Local Development

### Requirements

- `Node.js >= 20.9.0`
- `npm`
- an InsForge backend with the expected tables and buckets
- Gemini API access

### Install

```bash
npm install
```

### Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_INSFORGE_URL=
NEXT_PUBLIC_INSFORGE_ANON_KEY=
INSFORGE_SERVICE_KEY=
GEMINI_API_KEY=
OPENROUTER_API_KEY=
```

### Run

```bash
npm run dev
```

Open:

- `http://localhost:3000/login`
- `http://localhost:3000/register`

## Required Backend Shape

### Storage Buckets

- `test-uploads`
- `solution-photos`

### Expected Tables

- `profiles`
- `test_uploads`
- `problems`
- `daily_sessions`
- `daily_session_problems`
- `submissions`

## Development Notes

### Dev User Setup

There is a dev-only helper at:

```text
/dev/setup-users
```

It must stay unavailable in production.

### Upload Behavior

- Instructor uploads can contain multiple files
- Student submissions can contain multiple photos per problem
- Legacy single-file rows are still supported

### Source Images

Problem source images are best-effort.

- extraction can still succeed even if a source-image snapshot cannot be created
- this most often affects PDF page snapshot generation for visual-reference questions

## Quality Checks

Run before shipping changes:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

If your shell is on an older Node version:

```bash
source ~/.nvm/nvm.sh
nvm use 20.20.2
npm run lint
npx tsc --noEmit
npm run build
```

## Deployment

This project is prepared for InsForge deployment.

### Recommended Flow

```bash
source ~/.nvm/nvm.sh
nvm use 20.20.2
npm install
npm run lint
npx tsc --noEmit
npm run build
```

Then deploy the project root and provide the production environment variables listed above.

### Production Safety

- keep `INSFORGE_SERVICE_KEY` server-only
- keep `GEMINI_API_KEY` server-only
- keep `OPENROUTER_API_KEY` server-only
- do not expose real secrets in committed env examples
- `/dev/setup-users` must not be usable in production

### Post-Deployment Checklist

1. Open the app on desktop and mobile.
2. Log in as a student and start a session.
3. Submit at least one handwritten photo.
4. Confirm results remain locked until the full session is submitted.
5. Complete the session and generate AI feedback.
6. Log in as an instructor and verify upload, extraction, approval, assignment, and session review.
7. Confirm `/dev/setup-users` shows that it is unavailable in production.

## Current Status

The app currently supports the complete private practice loop:

- upload
- extract
- review
- approve
- assign
- solve
- submit
- review feedback

The product is optimized for controlled use with instructor-managed accounts rather than public signups and open content discovery.

## License

No license is currently declared in this repository.
