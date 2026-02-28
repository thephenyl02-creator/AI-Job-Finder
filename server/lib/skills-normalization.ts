export const SKILLS_SYNONYM_MAP: Record<string, string> = {
  "legal tech": "legal technology",
  "legal knowledge": "legal technology",
  "legal domain knowledge": "legal technology",
  "legal tech knowledge": "legal technology",
  "legal technology knowledge": "legal technology",
  "legal technology solutions": "legal technology",
  "legal tech adoption": "legal technology",
  "legal tech implementation": "legal technology",
  "legal technology implementation": "legal technology",
  "legal tech platforms": "legal technology",
  "legal software": "legal technology",

  "customer engagement": "client management",
  "client engagement": "client management",
  "client relations": "client management",
  "client relationship management": "client management",
  "customer relationship management": "client management",
  "customer success": "client management",
  "client management": "client management",
  "customer relations": "client management",
  "client success": "client management",

  "collaboration": "cross-functional collaboration",
  "cross-department collaboration": "cross-functional collaboration",
  "cross-functional collaboration": "cross-functional collaboration",
  "cross-functional stakeholder management": "cross-functional collaboration",
  "interdepartmental collaboration": "cross-functional collaboration",
  "team collaboration": "cross-functional collaboration",

  "ai integration": "ai solutions",
  "ai implementation": "ai solutions",
  "ai utilization": "ai solutions",
  "ai tools": "ai solutions",
  "ai": "ai solutions",
  "ai applications": "ai solutions",
  "ai-powered solutions": "ai solutions",
  "ai technology": "ai solutions",
  "ai adoption": "ai solutions",

  "process improvement": "process optimization",
  "process intelligence": "process optimization",
  "legal process improvement": "process optimization",
  "workflow optimization": "process optimization",
  "workflow design": "process optimization",
  "process automation": "process optimization",
  "operational efficiency": "process optimization",

  "legal workflows": "legal process design",
  "legal workflow design": "legal process design",
  "legal process management": "legal process design",
  "legal operations management": "legal process design",

  "stakeholder engagement": "stakeholder management",
  "stakeholder collaboration": "stakeholder management",
  "stakeholder relations": "stakeholder management",

  "communication": "stakeholder communication",
  "client communication": "stakeholder communication",
  "business communication": "stakeholder communication",

  "problem solving": "analytical problem solving",
  "critical thinking": "analytical problem solving",
  "analytical skills": "analytical problem solving",
  "problem-solving": "analytical problem solving",

  "leadership": "team leadership",
  "team development": "team leadership",
  "people management": "team leadership",
  "team management": "team leadership",

  "sales management": "sales leadership",
  "pipeline generation": "business development",
  "lead generation": "business development",

  "account management": "client account management",
  "relationship building": "client account management",
  "relationship management": "client account management",

  "sales": "sales strategy",
  "enterprise sales": "sales strategy",
  "b2b sales": "sales strategy",
  "solution sales": "sales strategy",

  "consulting": "strategic consulting",
  "strategic advisory": "strategic consulting",
  "technical consulting": "strategic consulting",
  "technical advisory": "strategic consulting",
  "advisory services": "strategic consulting",

  "user experience": "ux design",
  "user experience design": "ux design",
  "user interface design": "ux design",

  "customer support": "technical support",
  "client support": "technical support",

  "data analysis": "data analytics",
  "data reporting": "data analytics",
  "data visualization": "data analytics",
  "business intelligence": "data analytics",

  "data management": "data governance",
  "information governance": "data governance",

  "product development": "product management",
  "product strategy": "product management",
  "product ownership": "product management",
  "product roadmap": "product management",

  "project tracking": "project management",
  "program management": "project management",

  "agile methodologies": "agile/scrum",
  "agile development": "agile/scrum",
  "scrum": "agile/scrum",

  "documentation": "technical documentation",

  "investigative research": "legal research",
  "research": "legal research",

  "negotiation": "contract negotiation",
  "contract negotiation": "contract negotiation",
  "deal negotiation": "contract negotiation",

  "legal compliance": "regulatory compliance",
  "compliance": "regulatory compliance",
  "regulation": "regulatory compliance",
  "regulatory": "regulatory compliance",
  "compliance management": "regulatory compliance",

  "ip law": "intellectual property",
  "global ip laws": "intellectual property",
  "brand protection": "intellectual property",
  "patent law": "intellectual property",

  "software development": "software engineering",
  "programming": "software engineering",

  "b2b saas": "saas platforms",
  "web-based applications": "saas platforms",

  "legal content management": "knowledge management",

  "consultative selling": "solution selling",
  "consultative sales": "solution selling",

  "revenue operations": "sales operations",
  "sales forecasting": "sales operations",

  "data protection": "data privacy",
  "privacy law": "data privacy",
  "privacy compliance": "data privacy",

  "integration management": "api integrations",
  "system integrations": "api integrations",

  "technical architecture": "systems architecture",
  "solution architecture": "systems architecture",

  "bpm": "business process management",

  "legal pricing strategies": "legal pricing",

  "incident response": "security incident response",

  "ai governance": "ai compliance",

  "data infrastructure": "data engineering",

  "training": "training & development",
  "training development": "training & development",
  "employee training": "training & development",

  "go-to-market strategy": "go-to-market strategy",
  "gtm strategy": "go-to-market strategy",
  "market strategy": "go-to-market strategy",

  "onboarding": "client onboarding",
  "customer onboarding": "client onboarding",
  "user onboarding": "client onboarding",

  "generative ai": "generative ai",
  "gen ai": "generative ai",
  "llm": "generative ai",
  "large language models": "generative ai",

  "machine learning": "machine learning",
  "ml": "machine learning",
  "deep learning": "machine learning",

  "risk management": "risk management",
  "risk assessment": "risk management",
  "risk analysis": "risk management",

  "contract management": "contract lifecycle management",
  "contract lifecycle management": "contract lifecycle management",
  "clm": "contract lifecycle management",
  "clm platforms": "contract lifecycle management",
};

const UPPERCASE_WORDS = new Set(["ai", "ml", "api", "it", "crm", "erp", "saas", "nlp", "llm", "sql", "ui", "ux"]);

export function toTitleCase(str: string): string {
  return str.replace(/\b\w+/g, (word, offset) => {
    const lower = word.toLowerCase();
    if (UPPERCASE_WORDS.has(lower)) return lower.toUpperCase();
    if (["of", "and", "in", "for", "the", "a", "an", "to", "with"].includes(lower) && offset > 0) return lower;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
}

export function normalizeSkill(skill: string): string {
  const s = skill.toLowerCase().trim();
  if (!s) return s;
  return SKILLS_SYNONYM_MAP[s] || s;
}
