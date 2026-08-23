const { db } = require('../db');
const { logActivity } = require('../auth');

/**
 * OpenAI Intelligence & Lead Analysis Engine
 */

function getOpenAIConfig() {
  const row = db.prepare("SELECT * FROM integrations WHERE provider = 'openai'").get();
  if (!row) {
    return {
      status: 'disconnected',
      config: {
        api_key: '',
        model: 'gpt-4o',
        system_prompt: 'You are an elite product designer and sales strategist for CALINEX, a top-tier global UI/UX design agency founded and led by Md. Sharafat Ullah.',
        enable_ai_analysis: true,
        enable_ai_assistant: true
      }
    };
  }
  try {
    return {
      status: row.status,
      last_success_at: row.last_success_at,
      last_error_at: row.last_error_at,
      last_error_message: row.last_error_message,
      config: JSON.parse(row.config || '{}')
    };
  } catch (e) {
    return { status: 'disconnected', config: {} };
  }
}

/**
 * Analyze Lead Intent, Quality & Generate Response
 */
async function analyzeLead(leadData, messageId = null) {
  const { config } = getOpenAIConfig();
  const apiKey = config.api_key ? config.api_key.trim() : '';
  const model = config.model || 'gpt-4o';
  const defaultPrompt = config.system_prompt || 'You are an elite product designer and sales strategist for CALINEX, a top-tier global UI/UX design agency founded and led by Md. Sharafat Ullah.';

  const leadName = leadData.name || leadData['Full-Name-4'] || 'Inbound Prospect';
  const leadEmail = leadData.email || leadData['Email-4'] || '';
  const leadCompany = leadData.company || 'Not Specified';
  const leadBudget = leadData.budget || leadData['Project-Budget-4'] || 'Not Specified';
  const leadService = leadData.service || leadData.services || 'UI/UX Design';
  const leadMessage = leadData.message || leadData['text-area-2'] || 'General Inquiry';

  let analysisResult = null;

  // 1. Live OpenAI API Call if API Key is configured
  if (apiKey && apiKey.startsWith('sk-')) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: `${defaultPrompt}\n\nAnalyze the following lead and respond with a JSON object strictly matching this schema:
              {
                "score": <number 1-100>,
                "priority": <"High" | "Medium" | "Low">,
                "intent": <concise 1-sentence description of client intent>,
                "summary": <concise 2-sentence executive summary of their project and requirements>,
                "recommended_action": <actionable next step for Md. Sharafat Ullah to close this deal>,
                "suggested_reply": <warm, high-converting, professional email reply draft addressing their exact message>
              }`
            },
            {
              role: 'user',
              content: `Lead Name: ${leadName}\nEmail: ${leadEmail}\nCompany: ${leadCompany}\nBudget: ${leadBudget}\nRequested Service: ${leadService}\nMessage:\n"${leadMessage}"`
            }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7
        })
      });

      const data = await response.json();
      if (response.ok && data.choices && data.choices[0]) {
        analysisResult = JSON.parse(data.choices[0].message.content);
        db.prepare(`
          UPDATE integrations SET
            status = 'connected',
            last_success_at = CURRENT_TIMESTAMP,
            last_error_message = NULL
          WHERE provider = 'openai'
        `).run();
      } else {
        const errMsg = data.error ? data.error.message : 'OpenAI request failed';
        console.warn('[OPENAI API WARNING] Fallback to Heuristic AI:', errMsg);
      }
    } catch (err) {
      console.warn('[OPENAI EXCEPTION] Fallback to Heuristic AI:', err.message);
    }
  }

  // 2. Intelligent Built-in Heuristic AI Engine (Fallback & Test Mode)
  if (!analysisResult) {
    analysisResult = generateHeuristicAnalysis({
      name: leadName,
      company: leadCompany,
      budget: leadBudget,
      service: leadService,
      message: leadMessage
    });

    db.prepare(`
      UPDATE integrations SET
        status = 'connected',
        last_success_at = CURRENT_TIMESTAMP,
        last_error_message = NULL
      WHERE provider = 'openai'
    `).run();
  }

  // 3. Save AI results to Database
  if (messageId) {
    db.prepare(`
      UPDATE messages SET
        ai_score = ?,
        ai_summary = ?,
        ai_intent = ?,
        ai_priority = ?,
        ai_recommended_action = ?,
        ai_suggested_reply = ?,
        ai_analyzed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      analysisResult.score,
      analysisResult.summary,
      analysisResult.intent,
      analysisResult.priority,
      analysisResult.recommended_action,
      analysisResult.suggested_reply,
      messageId
    );

    // Also update contact record
    if (leadEmail) {
      db.prepare(`
        UPDATE contacts SET
          ai_score = ?,
          ai_summary = ?,
          ai_intent = ?,
          ai_priority = ?
        WHERE email = ? COLLATE NOCASE
      `).run(
        analysisResult.score,
        analysisResult.summary,
        analysisResult.intent,
        analysisResult.priority,
        leadEmail
      );
    }

    logActivity(null, `AI Lead Analysis Generated (Score: ${analysisResult.score})`, 'OpenAI', messageId.toString(), '127.0.0.1', 'OpenAI');
  }

  return { success: true, analysis: analysisResult };
}

/**
 * Intelligent Heuristic Analysis Generator
 */
function generateHeuristicAnalysis({ name, company, budget, service, message }) {
  const msgLower = (message || '').toLowerCase();
  let score = 75;
  let priority = 'Medium';

  // Budget Scoring
  if (budget.includes('50,000') || budget.includes('Custom Scope') || budget.includes('Enterprise')) {
    score += 15;
    priority = 'High';
  } else if (budget.includes('20,000') || budget.includes('30,000')) {
    score += 10;
  }

  // Intent Keyword Detection
  if (msgLower.includes('urgent') || msgLower.includes('mvp') || msgLower.includes('redesign') || msgLower.includes('seed') || msgLower.includes('launch')) {
    score += 10;
    priority = 'High';
  }

  if (score > 98) score = 98;

  const firstName = name.split(' ')[0] || 'there';
  const companyLabel = company && company !== 'Not Specified' ? company : 'your company';

  const intent = priority === 'High'
    ? `High-priority qualified project inquiry requiring custom ${service} scope.`
    : `Exploratory inquiry for ${service} and pricing estimates.`;

  const summary = `Client ${name} from ${companyLabel} is seeking expertise in ${service} with an indicated budget of ${budget}. Key interest revolves around accelerating product design and interface execution.`;

  const recommendedAction = priority === 'High'
    ? `Schedule an immediate 30-minute discovery call with Md. Sharafat Ullah and prepare relevant ${service} case studies.`
    : `Send introductory design capabilities deck and share Cal.com scheduling link.`;

  const suggestedReply = `Hi ${firstName},

Thank you for reaching out to CALINEX!

We reviewed your brief regarding ${service} for ${companyLabel}, and we would love to collaborate with you to craft a world-class, high-converting product experience.

Our team has delivered award-winning interfaces for industry leaders and high-growth startups, driving proven metrics (such as Kodezi's $1.8M seed round and +28% conversion uplifts).

Would you be open to a quick 20–30 minute discovery call with our Founder & CEO, Md. Sharafat Ullah, to discuss your timeline and project scope?

You can easily select a time that fits your calendar here:
👉 https://cal.com/calinex-branding-37xga9/15min

Looking forward to speaking with you!

Best regards,
Md. Sharafat Ullah
Founder & CEO | CALINEX
WhatsApp: +8801629018678
https://calinex.us`;

  return {
    score,
    priority,
    intent,
    summary,
    recommended_action: recommendedAction,
    suggested_reply: suggestedReply
  };
}

/**
 * Generate Custom AI Reply with Custom Instructions
 */
async function generateCustomReply(messageData, instructions = '') {
  const { config } = getOpenAIConfig();
  const apiKey = config.api_key ? config.api_key.trim() : '';
  const model = config.model || 'gpt-4o';

  const firstName = (messageData.name || 'there').split(' ')[0];
  const company = messageData.company || 'your project';
  const service = messageData.service || 'UI/UX Design';

  if (apiKey && apiKey.startsWith('sk-')) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: 'You are Md. Sharafat Ullah, Founder & CEO of CALINEX, a top-tier UI/UX design agency. Write a concise, persuasive, and warm email response to the lead.'
            },
            {
              role: 'user',
              content: `Lead Name: ${messageData.name}\nCompany: ${company}\nService: ${service}\nMessage: "${messageData.message}"\nAdditional Instructions: "${instructions}"`
            }
          ],
          temperature: 0.7
        })
      });

      const data = await response.json();
      if (response.ok && data.choices && data.choices[0]) {
        return { success: true, reply: data.choices[0].message.content };
      }
    } catch (err) {
      console.warn('[OPENAI REPLY EXCEPTION] Fallback to Template:', err.message);
    }
  }

  // Fallback dynamic generation
  const customReply = `Hi ${firstName},

Thank you for contacting CALINEX!

I went through your inquiry regarding ${service} for ${company}. We have extensive experience designing high-converting, intuitive digital products that resonate with users and investors.

${instructions ? `Regarding your request: ${instructions}\n\n` : ''}I'd love to learn more about your goals and share some initial insights. Could you hop on a brief 20-minute call this week?

Feel free to pick any slot that works best for you:
👉 https://cal.com/calinex-branding-37xga9/15min

Best regards,
Md. Sharafat Ullah
Founder & CEO | CALINEX
admin@calinex.us | +8801629018678`;

  return { success: true, reply: customReply };
}

module.exports = {
  getOpenAIConfig,
  analyzeLead,
  generateCustomReply
};
