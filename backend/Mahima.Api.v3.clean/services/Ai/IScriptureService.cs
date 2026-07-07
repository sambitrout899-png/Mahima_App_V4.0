<<<<<<< HEAD
using System.Collections.Generic;
=======
﻿using System.Collections.Generic;
>>>>>>> 6b902a41 (Update Mahima app server files and related changes)

namespace Mahima.Api.v3.clean.Services.Ai
{
    /// <summary>
<<<<<<< HEAD
    /// Supplies relevant Bible verses to ground the AI Pastor's answers.
=======
    /// Supplies relevant Bible verses to ground the AI Counseller's answers.
>>>>>>> 6b902a41 (Update Mahima app server files and related changes)
    ///
    /// This is the "equipped with Bible verses" part of the autonomous pastor:
    /// instead of trusting the model to recall references correctly (models do
    /// hallucinate verse numbers), the pastor pipeline retrieves real verses
    /// from a curated pack and injects them into the prompt as grounding
    /// context. The model is then instructed to quote ONLY from the supplied
    /// verses.
    /// </summary>
    public interface IScriptureService
    {
        /// <summary>
        /// Return the most relevant verses for a user question.
        /// </summary>
        /// <param name="question">The user's question / concern.</param>
        /// <param name="language">"en", "hi" or "pa".</param>
        /// <param name="max">Maximum verses to return.</param>
        IReadOnlyList<ScriptureVerse> FindRelevant(string question, string language, int max = 3);

        /// <summary>A single verse for the given theme, or a default if unknown.</summary>
        ScriptureVerse ForTheme(string theme, string language);
    }

    public sealed class ScriptureVerse
    {
        public string Reference { get; set; } = string.Empty; // e.g. "Philippians 4:6-7"
        public string Text { get; set; } = string.Empty;       // verse text in the requested language
        public string Theme { get; set; } = string.Empty;      // e.g. "anxiety"

        public override string ToString() => $"\"{Text}\" — {Reference}";
    }
}
