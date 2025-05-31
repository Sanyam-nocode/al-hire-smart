
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Advanced PDF text extraction with multiple strategies
async function extractTextFromPDF(pdfBuffer: ArrayBuffer): Promise<string> {
  try {
    console.log('Starting advanced PDF text extraction, buffer size:', pdfBuffer.byteLength);
    
    const uint8Array = new Uint8Array(pdfBuffer);
    let extractedText = '';
    
    // Convert to string using multiple encoding strategies
    let pdfString = '';
    try {
      pdfString = new TextDecoder('utf-8').decode(uint8Array);
    } catch {
      try {
        pdfString = new TextDecoder('latin1').decode(uint8Array);
      } catch {
        pdfString = new TextDecoder('windows-1252').decode(uint8Array);
      }
    }
    
    console.log('PDF string length:', pdfString.length);
    
    // Enhanced text extraction patterns - comprehensive approach
    const textExtractionPatterns = [
      // Standard PDF text operations
      /\(([^)]{2,})\)\s*Tj/g,
      /\(([^)]{2,})\)\s*TJ/g,
      /\[([^\]]{3,})\]\s*TJ/g,
      
      // Text with positioning commands
      /\(([^)]{2,})\)\s*[\d.-]+\s+[\d.-]+\s+Td/g,
      /\(([^)]{2,})\)\s*[\d.-]+\s+[\d.-]+\s+TD/g,
      /\(([^)]{2,})\)\s*[\d.-]+\s+[\d.-]+\s+Tm/g,
      
      // Show text operations with quotes
      /\(([^)]{2,})\)\s*'/g,
      /\(([^)]{2,})\)\s*"/g,
      
      // Text arrays with kerning
      /\[\s*\(([^)]{2,})\)\s*(?:[\d.-]+\s*)*\]\s*TJ/g,
      /\[\s*\(([^)]{3,})\)\s*\]\s*TJ/g,
      
      // Complex text operations in BT...ET blocks
      /BT\s*(?:[^ET]*?)\s*\(([^)]{3,})\)[^ET]*?ET/g,
      /BT[\s\S]*?\(([^)]{4,})\)[\s\S]*?ET/g,
      
      // Stream content extraction
      /stream[\s\S]*?\(([^)]{4,})\)[\s\S]*?endstream/g,
      
      // Direct text between quotes in various contexts
      /"([^"]{4,})"/g,
      /'([^']{4,})'/g,
      
      // Unicode text patterns
      /\\u([0-9a-fA-F]{4})/g,
      
      // Hexadecimal encoded text
      /<([0-9a-fA-F\s]{8,})>/g,
    ];
    
    const foundTexts = new Set<string>();
    
    // Apply all extraction patterns
    for (const pattern of textExtractionPatterns) {
      const matches = pdfString.matchAll(pattern);
      for (const match of matches) {
        let text = match[1];
        if (text && text.length > 1) {
          // Decode PDF text encoding
          text = decodePDFText(text);
          
          // Clean and validate text
          text = cleanExtractedText(text);
          
          // Only add meaningful text
          if (text.length > 2 && isValidText(text) && !isGibberish(text)) {
            foundTexts.add(text);
          }
        }
      }
    }
    
    // Enhanced stream content extraction
    const streamMatches = pdfString.matchAll(/stream\s*([\s\S]*?)\s*endstream/g);
    for (const match of streamMatches) {
      const streamContent = match[1];
      
      // Multiple text candidate patterns within streams
      const textPatterns = [
        /[A-Za-z][A-Za-z0-9@.,\-_\s\(\)]{8,}/g,
        /\b[A-Za-z]{2,}\s+[A-Za-z]{2,}(?:\s+[A-Za-z0-9@.,\-_]+){0,10}/g,
        /[A-Z][a-z]+(?:\s+[A-Za-z0-9@.,\-_]+){1,8}/g,
        /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/g,
        /\b\d{4}\s*[-–]\s*\d{4}\b/g,
        /\b(?:Present|Current|Now)\b/gi,
        /\b[A-Z]{2,}\s+[A-Z]{2,}/g,
      ];
      
      for (const pattern of textPatterns) {
        const candidates = streamContent.match(pattern);
        if (candidates) {
          candidates.forEach(candidate => {
            const cleaned = cleanExtractedText(candidate);
            if (cleaned.length > 4 && isValidText(cleaned) && !isGibberish(cleaned)) {
              foundTexts.add(cleaned);
            }
          });
        }
      }
    }
    
    // Extract readable text from the entire PDF string with improved patterns
    const readablePatterns = [
      // Names and professional titles
      /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g,
      // Email addresses
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      // Phone numbers
      /(?:\+\d{1,3}[-.\s]?)?\(?(?:\d{3})\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
      // LinkedIn URLs
      /(?:linkedin\.com\/in\/|linkedin\.com\/)[a-zA-Z0-9\-]+/g,
      // GitHub URLs
      /(?:github\.com\/)[a-zA-Z0-9\-]+/g,
      // Portfolio URLs
      /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9\-]+\.[a-zA-Z]{2,}(?:\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=]*)?/g,
      // Years and date ranges
      /\b(?:19|20)\d{2}\s*[-–]\s*(?:(?:19|20)\d{2}|Present|Current|Now)\b/gi,
      // Skills and technologies
      /\b(?:JavaScript|Python|Java|React|Node\.js|MongoDB|SQL|HTML|CSS|Git|AWS|Azure|Docker|Kubernetes|Angular|Vue\.js|TypeScript|C\+\+|C#|PHP|Ruby|Swift|Kotlin|Go|Rust|Scala|R|MATLAB|TensorFlow|PyTorch|Spark|Hadoop|Jenkins|Agile|Scrum|DevOps|Machine Learning|AI|Data Science|Cloud Computing|Microservices|RESTful|GraphQL|Redis|PostgreSQL|MySQL|Oracle|Elasticsearch|Tableau|Power BI|Salesforce|SAP|Microsoft Office|Adobe|Photoshop|Illustrator|AutoCAD|SolidWorks|Excel|PowerPoint|Word|Outlook|SharePoint|Teams|Slack|Jira|Confluence|Trello|Asana|Figma|Sketch|InVision|Zeplin|Webpack|Babel|ESLint|Prettier|Jest|Cypress|Selenium|Postman|Insomnia|Swagger|Linux|Windows|macOS|Ubuntu|CentOS|RHEL|Bash|PowerShell|Zsh|Vim|VSCode|IntelliJ|Eclipse|Xcode|Android Studio|Unity|Unreal Engine|Blender|Maya|3ds Max|Cinema 4D|After Effects|Premiere Pro|Final Cut Pro|Logic Pro|Pro Tools|Ableton Live|FL Studio|Cubase|Reason|Sibelius|Finale|MuseScore|Notion|Obsidian|Roam Research|Anki|Memrise|Duolingo|Babbel|Rosetta Stone)\b/gi,
      // Education keywords
      /\b(?:Bachelor|Master|PhD|Doctorate|Degree|University|College|Institute|School|Certification|Certificate|Diploma|Associate|Graduate|Undergraduate|MBA|MS|MA|BS|BA|BE|BTech|MTech|MSc|BSc|PhD|DPhil|EdD|JD|MD|DDS|PharmD|DVM|PsyD|DNP|DSW|DPT|OTD|AuD|DBA|DNSc|DrPH|DSc|DMin|DMA|DFA|DMus|DA|DEd|DEng|DEnv|DArch|DDS|DMD|DPM|DO|DC|DAc|ND|DOM|LAc|DACM|DAOM|DTCM|MSTCM|MSOM|MAc|LAc|Dipl\.Ac|Dipl\.OM|Dipl\.CH|RN|LPN|CNA|CMA|RMA|CPA|CFA|FRM|PMP|CISSP|CISA|CISM|CEH|CCNA|CCNP|CCIE|MCSE|MCSA|VCP|AWS|Azure|GCP|Salesforce|Tableau|Six Sigma|Lean|Agile|Scrum|ITIL|Prince2|CompTIA|Cisco|Microsoft|Oracle|IBM|SAP|VMware|Citrix|RedHat|SANS|ISC2|ISACA|PMI|IIBA|ISTQB|TOGAF|COBIT|COSO|NIST|ISO)\b/gi,
      // Company and organization names
      /\b[A-Z][a-zA-Z&\s]{2,30}(?:Inc|Corp|Corporation|Company|Co|LLC|Ltd|Limited|LP|LLP|PC|PLLC|PA|Group|Associates|Partners|Consulting|Solutions|Technologies|Systems|Services|International|Global|Worldwide|Enterprise|Enterprises|Industries|Holdings|Ventures|Capital|Investments|Fund|Funds|Management|Advisory|Advisors|Research|Development|Innovation|Labs|Laboratory|Laboratories|Institute|Foundation|Center|Centre|Agency|Bureau|Department|Division|Unit|Team|Office|Branch|Subsidiary|Affiliate|Alliance|Network|Federation|Association|Society|Organization|Club|Union|Collective|Cooperative|Consortium|Coalition|Partnership|Joint Venture|Merger|Acquisition|IPO|Private Equity|Venture Capital|Hedge Fund|Investment Bank|Commercial Bank|Retail Bank|Credit Union|Insurance|Mutual Fund|REIT|ETF|Index Fund|Pension Fund|Endowment|Trust|Estate|Wealth Management|Asset Management|Portfolio Management|Risk Management|Compliance|Audit|Accounting|Tax|Legal|Law Firm|Consulting|Strategy|Operations|Marketing|Sales|Business Development|Product Management|Project Management|Program Management|Change Management|Quality Assurance|Customer Service|Human Resources|Talent Acquisition|Recruiting|Staffing|Training|Learning|Education|Publishing|Media|Broadcasting|Entertainment|Gaming|Sports|Fitness|Health|Healthcare|Medical|Pharmaceutical|Biotechnology|Life Sciences|Clinical Research|Regulatory Affairs|Manufacturing|Production|Supply Chain|Logistics|Transportation|Shipping|Freight|Warehouse|Distribution|Retail|E-commerce|Online|Digital|Software|Hardware|Technology|IT|Information Technology|Computer|Computing|Data|Analytics|Business Intelligence|Artificial Intelligence|Machine Learning|Deep Learning|Natural Language Processing|Computer Vision|Robotics|Automation|IoT|Internet of Things|Cloud|SaaS|PaaS|IaaS|Platform|Infrastructure|Network|Security|Cybersecurity|Privacy|Blockchain|Cryptocurrency|Fintech|Insurtech|Healthtech|Edtech|Proptech|Agtech|Cleantech|Greentech|Renewable Energy|Solar|Wind|Hydro|Nuclear|Oil|Gas|Coal|Mining|Agriculture|Food|Beverage|Restaurant|Hospitality|Travel|Tourism|Real Estate|Construction|Architecture|Engineering|Design|Creative|Art|Fashion|Beauty|Cosmetics|Personal Care|Home|Garden|Automotive|Aerospace|Defense|Government|Public Sector|Non-profit|NGO|Charity|Foundation|Religious|Spiritual|Cultural|Social|Environmental|Political|Economic|Financial|Academic|Scientific|Research|Medical|Healthcare|Pharmaceutical|Biotechnology|Life Sciences|Clinical|Regulatory|Manufacturing|Industrial|Chemical|Materials|Textiles|Paper|Packaging|Printing|Publishing|Media|Journalism|Communications|Public Relations|Advertising|Marketing|Sales|Business|Commercial|Trade|Import|Export|International|Global|Regional|Local|Community|Urban|Rural|Suburban|Metropolitan|City|State|Provincial|National|Federal|Municipal|County|District|Zone|Area|Region|Territory|Country|Continent|World|Universe|Galaxy|Solar System|Planet|Earth|Moon|Sun|Star|Space|Astronomy|Physics|Chemistry|Biology|Mathematics|Statistics|Economics|Finance|Business|Management|Leadership|Strategy|Operations|Marketing|Sales|Product|Service|Customer|Client|Partner|Vendor|Supplier|Contractor|Consultant|Freelancer|Employee|Worker|Staff|Team|Department|Division|Unit|Group|Office|Location|Site|Facility|Building|Campus|Headquarters|Branch|Subsidiary|Affiliate|Joint Venture|Partnership|Alliance|Network|Association|Organization|Institution|Company|Corporation|Business|Enterprise|Firm|Agency|Bureau|Department|Ministry|Office|Commission|Committee|Board|Council|Assembly|Parliament|Congress|Senate|House|Court|Tribunal|Arbitration|Mediation|Negotiation|Settlement|Agreement|Contract|Deal|Transaction|Acquisition|Merger|IPO|Private Equity|Venture Capital|Investment|Funding|Financing|Capital|Money|Currency|Dollar|Euro|Pound|Yen|Yuan|Rupee|Peso|Real|Rand|Krona|Franc|Mark|Lira|Drachma|Shekel|Dirham|Riyal|Dinar|Taka|Won|Baht|Ringgit|Singapore Dollar|Hong Kong Dollar|Canadian Dollar|Australian Dollar|New Zealand Dollar|Swiss Franc|Norwegian Krone|Swedish Krona|Danish Krone|Polish Zloty|Czech Koruna|Hungarian Forint|Romanian Leu|Bulgarian Lev|Croatian Kuna|Serbian Dinar|Bosnian Mark|Macedonian Denar|Albanian Lek|Moldovan Leu|Ukrainian Hryvnia|Russian Ruble|Belarusian Ruble|Kazakh Tenge|Uzbek Som|Turkmen Manat|Tajik Somoni|Kyrgyz Som|Afghan Afghani|Pakistani Rupee|Indian Rupee|Bangladeshi Taka|Sri Lankan Rupee|Nepalese Rupee|Bhutanese Ngultrum|Maldivian Rufiyaa|Myanmar Kyat|Thai Baht|Lao Kip|Cambodian Riel|Vietnamese Dong|Malaysian Ringgit|Singaporean Dollar|Brunei Dollar|Indonesian Rupiah|Philippine Peso|Chinese Yuan|Hong Kong Dollar|Macanese Pataca|Taiwanese Dollar|Japanese Yen|South Korean Won|North Korean Won|Mongolian Tugrik|Israeli Shekel|Jordanian Dinar|Lebanese Pound|Syrian Pound|Iraqi Dinar|Iranian Rial|Turkish Lira|Armenian Dram|Azerbaijani Manat|Georgian Lari|Egyptian Pound|Libyan Dinar|Tunisian Dinar|Algerian Dinar|Moroccan Dirham|Mauritanian Ouguiya|Senegalese Franc|Malian Franc|Burkina Faso Franc|Niger Franc|Chad Franc|Central African Franc|Cameroon Franc|Equatorial Guinea Franc|Gabon Franc|Republic of Congo Franc|Democratic Republic of Congo Franc|Burundian Franc|Rwandan Franc|Ugandan Shilling|Kenyan Shilling|Tanzanian Shilling|Ethiopian Birr|Eritrean Nakfa|Djiboutian Franc|Somali Shilling|South Sudanese Pound|Sudanese Pound|South African Rand|Namibian Dollar|Botswana Pula|Zambian Kwacha|Zimbabwean Dollar|Malawian Kwacha|Mozambican Metical|Swazi Lilangeni|Lesotho Loti|Malagasy Ariary|Mauritian Rupee|Seychellois Rupee|Comoran Franc|Cape Verdean Escudo|West African Franc|Central African Franc|Nigerian Naira|Ghanaian Cedi|Sierra Leonean Leone|Liberian Dollar|Guinean Franc|Guinea-Bissau Peso|Gambian Dalasi|Ivorian Franc|Togolese Franc|Beninese Franc|Brazilian Real|Argentine Peso|Chilean Peso|Colombian Peso|Peruvian Sol|Ecuadorian Dollar|Venezuelan Bolívar|Guyanese Dollar|Surinamese Dollar|French Guianese Euro|Uruguayan Peso|Paraguayan Guaraní|Bolivian Boliviano|Mexican Peso|Guatemalan Quetzal|Belizean Dollar|Salvadoran Colón|Honduran Lempira|Nicaraguan Córdoba|Costa Rican Colón|Panamanian Balboa|Cuban Peso|Dominican Peso|Haitian Gourde|Jamaican Dollar|Barbadian Dollar|Trinidad and Tobago Dollar|Bahamian Dollar|Eastern Caribbean Dollar|US Dollar|Canadian Dollar|Greenlandic Krone|Icelandic Króna|Faroese Króna|Norwegian Krone|Swedish Krona|Finnish Euro|Danish Krone|Estonian Euro|Latvian Euro|Lithuanian Euro|Polish Złoty|German Euro|Dutch Euro|Belgian Euro|Luxembourg Euro|French Euro|Swiss Franc|Austrian Euro|Liechtenstein Franc|Italian Euro|Vatican Euro|San Marino Euro|Maltese Euro|Slovenian Euro|Croatian Kuna|Bosnian Mark|Serbian Dinar|Montenegrin Euro|Macedonian Denar|Albanian Lek|Greek Euro|Bulgarian Lev|Romanian Leu|Moldovan Leu|Ukrainian Hryvnia|Belarusian Ruble|Russian Ruble|Lithuanian Litas|Latvian Lats|Estonian Kroon|Czech Koruna|Slovak Euro|Hungarian Forint|Polish Złoty|Slovenian Tolar|Croatian Kuna|Yugoslav Dinar|Serbian Dinar|Montenegrin Dinar|Bosnian Dinar|Macedonian Denar|Albanian Lek|Greek Drachma|Turkish Lira|Cypriot Pound|British Pound|Irish Punt|Portuguese Escudo|Spanish Peseta|French Franc|Belgian Franc|Dutch Guilder|German Mark|Italian Lira|Austrian Schilling|Swiss Franc|Liechtenstein Franc|Andorran Peseta|Monégasque Franc|Vatican Lira|San Marino Lira|Maltese Lira|Gibraltar Pound|Jersey Pound|Guernsey Pound|Isle of Man Pound|Falkland Islands Pound|Saint Helena Pound|Tristan da Cunha Pound|Ascension Pound|Australian Dollar|New Zealand Dollar|Fijian Dollar|Papua New Guinean Kina|Solomon Islands Dollar|Vanuatu Vatu|New Caledonian Franc|French Polynesian Franc|Wallis and Futuna Franc|Samoan Tala|Tongan Paʻanga|Cook Islands Dollar|Niuean Dollar|Pitcairn Islands Dollar|Norfolk Island Dollar|Christmas Island Dollar|Cocos Islands Dollar|Heard Island Dollar|McDonald Islands Dollar|Antarctic Dollar|Argentine Peso|Chilean Peso|Colombian Peso|Peruvian Sol|Brazilian Real|Venezuelan Bolívar|Guyanese Dollar|Surinamese Dollar|French Guianese Euro|Uruguayan Peso|Paraguayan Guaraní|Bolivian Boliviano|Ecuadorian Dollar|Mexican Peso|Guatemalan Quetzal|Belizean Dollar|Salvadoran Colón|Honduran Lempira|Nicaraguan Córdoba|Costa Rican Colón|Panamanian Balboa)\b/gi,
      // Location patterns
      /\b(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*[A-Z]{2,3}\b/g,
      /\b[A-Z][a-z]+,\s*[A-Z][a-z]+\b/g,
      // Comprehensive text blocks
      /[A-Z][a-zA-Z0-9\s.,\-()]{20,100}(?:\.|!|\?|$)/g,
    ];
    
    for (const pattern of readablePatterns) {
      const matches = pdfString.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const cleaned = cleanExtractedText(match);
          if (cleaned.length > 3 && isValidText(cleaned) && !isGibberish(cleaned)) {
            foundTexts.add(cleaned);
          }
        });
      }
    }
    
    // Join all found text pieces with better structure
    extractedText = Array.from(foundTexts)
      .filter(text => text.length > 2)
      .sort((a, b) => b.length - a.length) // Prioritize longer, more meaningful text
      .join(' ');
    
    // Final comprehensive cleanup
    extractedText = extractedText
      .replace(/\s+/g, ' ')
      .replace(/([.!?])\s*([A-Z])/g, '$1 $2')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .trim();
    
    console.log('Advanced extraction completed, length:', extractedText.length);
    console.log('Sample text (first 1000 chars):', extractedText.substring(0, 1000));
    
    return extractedText;
  } catch (error) {
    console.error('Advanced PDF extraction failed:', error);
    return '';
  }
}

// Decode PDF text encoding issues
function decodePDFText(text: string): string {
  try {
    // Handle common PDF encoding issues
    text = text
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
      .replace(/\\x([0-9a-fA-F]{2})/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
      .replace(/\\([0-7]{3})/g, (_, code) => String.fromCharCode(parseInt(code, 8)))
      .replace(/\\([0-7]{1,2})/g, (_, code) => String.fromCharCode(parseInt(code, 8)))
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\\/g, '\\')
      .replace(/\\n/g, ' ')
      .replace(/\\r/g, ' ')
      .replace(/\\t/g, ' ');
    
    return text;
  } catch {
    return text;
  }
}

// Clean extracted text
function cleanExtractedText(text: string): string {
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '') // Keep printable ASCII and Unicode
    .replace(/\s+/g, ' ')
    .trim();
}

// Check if text is valid (contains letters and meaningful content)
function isValidText(text: string): boolean {
  // Must contain letters
  if (!/[a-zA-Z]/.test(text)) return false;
  
  // Must have reasonable character distribution
  const alphanumericRatio = (text.match(/[a-zA-Z0-9]/g) || []).length / text.length;
  if (alphanumericRatio < 0.6) return false;
  
  // Shouldn't be mostly repeated characters
  const uniqueChars = new Set(text.toLowerCase()).size;
  if (uniqueChars < Math.max(3, text.length / 8)) return false;
  
  // Shouldn't be common PDF artifacts
  const pdfArtifacts = ['obj', 'endobj', 'stream', 'endstream', 'xref', 'trailer', 'startxref'];
  if (pdfArtifacts.some(artifact => text.toLowerCase().includes(artifact))) return false;
  
  return true;
}

// Check if text appears to be gibberish
function isGibberish(text: string): boolean {
  // Reject text that's mostly non-alphanumeric
  const alphanumericRatio = (text.match(/[a-zA-Z0-9]/g) || []).length / text.length;
  if (alphanumericRatio < 0.5) return true;
  
  // Reject text with too many repeated characters
  const uniqueChars = new Set(text.toLowerCase()).size;
  if (uniqueChars < Math.max(3, text.length / 8)) return true;
  
  // Reject very short fragments
  if (text.length < 5) return true;
  
  // Reject strings that are mostly numbers or symbols
  const letterRatio = (text.match(/[a-zA-Z]/g) || []).length / text.length;
  if (letterRatio < 0.4) return true;
  
  return false;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeUrl, candidateId } = await req.json();
    console.log('=== COMPREHENSIVE RESUME EXTRACTION REQUEST ===');
    console.log('Resume URL:', resumeUrl);
    console.log('Candidate ID:', candidateId);

    if (!resumeUrl || !candidateId) {
      console.error('Missing required parameters');
      return new Response(JSON.stringify({ 
        error: 'Resume URL and candidate ID are required',
        success: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      return new Response(JSON.stringify({ 
        error: 'OpenAI API key not configured',
        success: false 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('=== DOWNLOADING PDF ===');
    
    // Extract file path from URL
    const urlParts = resumeUrl.split('/');
    const bucketIndex = urlParts.findIndex(part => part === 'resumes');
    if (bucketIndex === -1 || bucketIndex >= urlParts.length - 1) {
      console.error('Invalid resume URL format:', resumeUrl);
      return new Response(JSON.stringify({ 
        error: 'Invalid resume URL format',
        success: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const filePath = urlParts.slice(bucketIndex + 1).join('/');
    console.log('File path:', filePath);

    // Download file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('resumes')
      .download(filePath);

    if (downloadError || !fileData) {
      console.error('Download error:', downloadError);
      return new Response(JSON.stringify({ 
        error: `Failed to download resume: ${downloadError?.message || 'No file data'}`,
        success: false 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract text from PDF with advanced algorithm
    console.log('=== ADVANCED TEXT EXTRACTION FROM PDF ===');
    const pdfBuffer = await fileData.arrayBuffer();
    const resumeText = await extractTextFromPDF(pdfBuffer);
    
    console.log('Extracted text length:', resumeText.length);
    console.log('Extracted text preview:', resumeText.substring(0, 2000));

    if (!resumeText || resumeText.length < 50) {
      console.error('Insufficient text extracted from PDF');
      return new Response(JSON.stringify({ 
        error: 'Could not extract sufficient readable text from PDF. The PDF might be image-based, password-protected, or have an unusual format.',
        success: false,
        debugInfo: {
          extractedTextLength: resumeText.length,
          extractedTextSample: resumeText.substring(0, 500)
        }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ultra-comprehensive OpenAI prompt for maximum data extraction
    console.log('=== CALLING OPENAI WITH ULTRA-COMPREHENSIVE PROMPT ===');
    const prompt = `You are an expert resume parser and comprehensive data analyst with 20+ years of experience in talent acquisition and HR data management. Your task is to perform an exhaustive, detailed analysis of this resume text and extract EVERY piece of professional information available.

CRITICAL INSTRUCTIONS:
- Read through the ENTIRE resume text multiple times
- Extract EVERY detail mentioned, no matter how small
- Look for information in ALL sections: header, summary, experience, education, skills, certifications, projects, achievements, etc.
- Pay special attention to contact details, work history, education background, technical skills, and professional accomplishments
- If any information appears in multiple formats or locations, use the most complete version
- For dates, look for both explicit dates and calculate experience based on work history
- For skills, extract ALL technical skills, tools, technologies, programming languages, certifications, and soft skills mentioned

RESUME TEXT TO ANALYZE:
"${resumeText}"

EXTRACTION REQUIREMENTS:
Please perform a comprehensive analysis and extract information in this EXACT JSON format. For each field, extract the actual information from the resume. If information is not clearly present, use null for that field.

{
  "personal_info": {
    "full_name": "Extract the complete full name from the resume header or contact section",
    "email": "Extract email address (look for @ symbol patterns)",
    "phone": "Extract phone number (look for number patterns with country codes, dashes, spaces, parentheses)",
    "location": "Extract full location (city, state, country - look for address information)",
    "linkedin_url": "Extract LinkedIn profile URL (look for linkedin.com patterns)",
    "github_url": "Extract GitHub profile URL (look for github.com patterns)",
    "portfolio_url": "Extract portfolio or personal website URL (look for http/www patterns)",
    "address": "Extract full postal address if mentioned"
  },
  "professional_summary": {
    "current_role": "Extract most recent job title or professional designation",
    "summary": "Extract professional summary, objective, or profile statement (full text)",
    "total_experience_years": "Calculate total years of professional experience based on work history dates",
    "industry": "Identify the primary industry or field of work",
    "specialization": "Extract area of specialization or expertise"
  },
  "education": {
    "qualification": "Extract highest degree with field of study (e.g., Bachelor of Computer Science, MBA in Finance)",
    "institution": "Extract university, college, or educational institution name",
    "graduation_year": "Extract year of graduation or completion",
    "gpa": "Extract GPA or grades if mentioned",
    "additional_education": "Extract any additional degrees, diplomas, courses, or certifications",
    "education_details": "Extract complete education history with all institutions and qualifications"
  },
  "skills": {
    "technical_skills": "Extract ALL technical skills mentioned (software, tools, methodologies, frameworks)",
    "programming_languages": "Extract ALL programming languages mentioned",
    "tools_and_frameworks": "Extract ALL tools, frameworks, platforms, and technologies",
    "soft_skills": "Extract ALL soft skills and interpersonal abilities mentioned",
    "certifications": "Extract ALL professional certifications and licenses",
    "languages": "Extract ALL languages spoken with proficiency levels if mentioned"
  },
  "work_experience": {
    "companies": "Extract ALL company names where the person has worked",
    "roles": "Extract ALL job titles and positions held",
    "experience_summary": "Provide a comprehensive summary of work experience and career progression",
    "current_company": "Extract current or most recent company name",
    "current_position": "Extract current or most recent job title",
    "years_at_current_role": "Calculate years in current position",
    "key_achievements": "Extract ALL major achievements and accomplishments mentioned",
    "responsibilities": "Extract key job responsibilities and duties from all roles"
  },
  "projects": {
    "project_names": "Extract names of all projects mentioned",
    "project_descriptions": "Extract descriptions of significant projects worked on",
    "technologies_used": "Extract technologies and tools used in projects"
  },
  "certifications_and_awards": {
    "professional_certifications": "Extract ALL professional certifications with issuing bodies",
    "awards": "Extract ALL awards, honors, and recognitions received",
    "publications": "Extract any publications, papers, or articles authored",
    "patents": "Extract any patents held"
  },
  "additional_info": {
    "salary_expectation": "Extract any salary expectations or compensation requirements mentioned",
    "availability": "Extract availability information (notice period, start date preferences)",
    "notable_achievements": "Extract ALL significant achievements, awards, and recognitions",
    "volunteer_experience": "Extract volunteer work and community involvement",
    "interests": "Extract personal interests and hobbies mentioned",
    "references": "Extract reference information if provided",
    "visa_status": "Extract work authorization or visa status if mentioned",
    "willingness_to_relocate": "Extract information about relocation preferences",
    "preferred_work_environment": "Extract preferences for remote/hybrid/office work"
  }
}

CRITICAL EXTRACTION RULES:
1. Extract information EXACTLY as it appears in the resume - do not modify or interpret
2. For experience calculation: Look for date ranges (YYYY-YYYY format) and calculate total years
3. For skills: Include EVERYTHING mentioned - programming languages, tools, frameworks, methodologies, soft skills
4. For education: Include degree type, major/field, institution name, and graduation year
5. For contact info: Be precise with email, phone, and URL formats
6. Use null only when information is genuinely not present in the resume
7. For lists (skills, companies, etc.), provide arrays with all items found
8. Pay attention to headers, bullet points, and formatted sections
9. Look for information in unconventional locations (footers, headers, sidebars)
10. Extract ALL company names, job titles, and date ranges from work experience section

Remember: Your goal is 100% accuracy and completeness. Extract EVERY piece of information available in this resume.`;

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: 'You are the world\'s most experienced and accurate resume parser. You extract comprehensive information from resumes with 100% accuracy and completeness. Always respond with valid JSON containing all requested fields. Never miss any information that exists in the resume text. Be thorough, precise, and exhaustive in your extraction.'
          },
          { 
            role: 'user', 
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 3000,
      }),
    });

    if (!openAIResponse.ok) {
      console.error('OpenAI API error:', openAIResponse.status);
      const errorText = await openAIResponse.text();
      console.error('OpenAI error details:', errorText);
      return new Response(JSON.stringify({ 
        error: `OpenAI API error: ${openAIResponse.status}`,
        success: false 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openAIData = await openAIResponse.json();
    console.log('OpenAI comprehensive response received');

    if (!openAIData.choices?.[0]?.message?.content) {
      console.error('Invalid OpenAI response structure');
      return new Response(JSON.stringify({ 
        error: 'Invalid response from AI service',
        success: false 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse comprehensive AI response
    console.log('=== PARSING ULTRA-COMPREHENSIVE AI RESPONSE ===');
    let extractedData;
    try {
      let content = openAIData.choices[0].message.content.trim();
      console.log('Raw comprehensive AI content:', content);
      
      // Clean markdown formatting
      content = content.replace(/```json\s*|\s*```/g, '');
      content = content.replace(/```\s*|\s*```/g, '');
      
      // Extract JSON object
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        content = jsonMatch[0];
      }
      
      extractedData = JSON.parse(content);
      console.log('Successfully parsed ultra-comprehensive extracted data:', JSON.stringify(extractedData, null, 2));
      
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Content that failed to parse:', openAIData.choices[0].message.content);
      
      return new Response(JSON.stringify({ 
        error: 'Failed to parse AI response as JSON',
        success: false,
        debugInfo: {
          rawResponse: openAIData.choices[0].message.content,
          parseError: parseError.message
        }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare ultra-comprehensive database update
    console.log('=== PREPARING ULTRA-COMPREHENSIVE DATABASE UPDATE ===');
    const updateData: any = {
      resume_content: JSON.stringify(extractedData),
      updated_at: new Date().toISOString(),
    };

    // Map personal info comprehensively
    if (extractedData.personal_info) {
      const personal = extractedData.personal_info;
      
      if (personal.email && typeof personal.email === 'string' && personal.email.includes('@')) {
        updateData.email = personal.email.trim().substring(0, 255);
        console.log('Adding email:', updateData.email);
      }
      
      if (personal.phone && typeof personal.phone === 'string' && personal.phone.trim().length > 5) {
        const cleanPhone = personal.phone.trim().replace(/[^\d+\-\s\(\)]/g, '');
        if (cleanPhone.length >= 7) {
          updateData.phone = cleanPhone.substring(0, 20);
          console.log('Adding phone:', updateData.phone);
        }
      }
      
      if (personal.location && typeof personal.location === 'string' && personal.location.trim().length > 2) {
        updateData.location = personal.location.trim().substring(0, 200);
        console.log('Adding location:', updateData.location);
      }
      
      if (personal.linkedin_url && typeof personal.linkedin_url === 'string' && personal.linkedin_url.includes('linkedin')) {
        updateData.linkedin_url = personal.linkedin_url.trim().substring(0, 500);
        console.log('Adding LinkedIn URL:', updateData.linkedin_url);
      }
      
      if (personal.github_url && typeof personal.github_url === 'string' && personal.github_url.includes('github')) {
        updateData.github_url = personal.github_url.trim().substring(0, 500);
        console.log('Adding GitHub URL:', updateData.github_url);
      }
      
      if (personal.portfolio_url && typeof personal.portfolio_url === 'string' && personal.portfolio_url.includes('http')) {
        updateData.portfolio_url = personal.portfolio_url.trim().substring(0, 500);
        console.log('Adding portfolio URL:', updateData.portfolio_url);
      }
    }

    // Map professional info comprehensively
    if (extractedData.professional_summary) {
      const professional = extractedData.professional_summary;
      
      if (professional.current_role && typeof professional.current_role === 'string' && professional.current_role.trim().length > 2) {
        updateData.title = professional.current_role.trim().substring(0, 200);
        console.log('Adding current role/title:', updateData.title);
      }
      
      if (professional.summary && typeof professional.summary === 'string' && professional.summary.trim().length > 10) {
        updateData.summary = professional.summary.trim().substring(0, 1000);
        console.log('Adding professional summary:', updateData.summary.substring(0, 100) + '...');
      }
      
      if (professional.total_experience_years) {
        let experienceYears = null;
        if (typeof professional.total_experience_years === 'number') {
          experienceYears = professional.total_experience_years;
        } else if (typeof professional.total_experience_years === 'string') {
          const parsed = parseInt(professional.total_experience_years);
          if (!isNaN(parsed) && parsed > 0 && parsed <= 50) {
            experienceYears = parsed;
          }
        }
        if (experienceYears !== null) {
          updateData.experience_years = experienceYears;
          console.log('Adding experience years:', updateData.experience_years);
        }
      }
    }

    // Map education comprehensively
    if (extractedData.education) {
      const education = extractedData.education;
      const educationParts = [];
      
      if (education.qualification) educationParts.push(education.qualification);
      if (education.institution) educationParts.push(education.institution);
      if (education.graduation_year) educationParts.push(education.graduation_year.toString());
      if (education.additional_education) educationParts.push(education.additional_education);
      if (education.education_details) educationParts.push(education.education_details);
      
      if (educationParts.length > 0) {
        updateData.education = educationParts.join(' | ').substring(0, 500);
        console.log('Adding comprehensive education:', updateData.education);
      }
    }

    // Map skills ultra-comprehensively
    const allSkills = [];
    if (extractedData.skills) {
      const skills = extractedData.skills;
      
      if (skills.technical_skills && Array.isArray(skills.technical_skills)) {
        allSkills.push(...skills.technical_skills);
      }
      if (skills.programming_languages && Array.isArray(skills.programming_languages)) {
        allSkills.push(...skills.programming_languages);
      }
      if (skills.tools_and_frameworks && Array.isArray(skills.tools_and_frameworks)) {
        allSkills.push(...skills.tools_and_frameworks);
      }
      if (skills.soft_skills && Array.isArray(skills.soft_skills)) {
        allSkills.push(...skills.soft_skills);
      }
      if (skills.certifications && Array.isArray(skills.certifications)) {
        allSkills.push(...skills.certifications);
      }
      if (skills.languages && Array.isArray(skills.languages)) {
        allSkills.push(...skills.languages);
      }
    }
    
    // Also extract skills from other sections
    if (extractedData.certifications_and_awards?.professional_certifications && Array.isArray(extractedData.certifications_and_awards.professional_certifications)) {
      allSkills.push(...extractedData.certifications_and_awards.professional_certifications);
    }
    
    if (extractedData.projects?.technologies_used && Array.isArray(extractedData.projects.technologies_used)) {
      allSkills.push(...extractedData.projects.technologies_used);
    }
    
    if (allSkills.length > 0) {
      const validSkills = allSkills
        .filter(skill => skill && typeof skill === 'string' && skill.trim().length > 1)
        .map(skill => skill.trim())
        .filter((skill, index, arr) => arr.indexOf(skill) === index) // Remove duplicates
        .slice(0, 100); // Increased limit for comprehensive skills
      
      if (validSkills.length > 0) {
        updateData.skills = validSkills;
        console.log('Adding ultra-comprehensive skills:', validSkills.length, 'skills total');
      }
    }

    // Add salary expectation if available
    if (extractedData.additional_info?.salary_expectation && typeof extractedData.additional_info.salary_expectation === 'string') {
      const salaryText = extractedData.additional_info.salary_expectation.trim();
      // Try to extract numeric value from salary text
      const salaryMatch = salaryText.match(/(\d+(?:,\d{3})*(?:\.\d{2})?)/);
      if (salaryMatch) {
        const salaryValue = parseInt(salaryMatch[1].replace(/,/g, ''));
        if (salaryValue > 0 && salaryValue < 10000000) { // Reasonable salary range
          updateData.salary_expectation = salaryValue;
          console.log('Adding salary expectation:', updateData.salary_expectation);
        }
      }
    }

    console.log('Final ultra-comprehensive update data:', JSON.stringify(updateData, null, 2));

    // Update candidate profile with ultra-comprehensive data
    console.log('=== UPDATING DATABASE WITH ULTRA-COMPREHENSIVE DATA ===');
    const { data: updatedProfile, error: updateError } = await supabase
      .from('candidate_profiles')
      .update(updateData)
      .eq('id', candidateId)
      .select()
      .single();

    if (updateError) {
      console.error('Database update error:', updateError);
      return new Response(JSON.stringify({ 
        error: 'Failed to update candidate profile', 
        details: updateError.message,
        success: false 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('=== ULTRA-COMPREHENSIVE SUCCESS ===');
    console.log('Profile updated successfully with ultra-comprehensive data');

    return new Response(JSON.stringify({ 
      success: true,
      extractedData,
      updatedProfile,
      message: 'Resume data ultra-comprehensively extracted and profile updated successfully with all available information'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('=== FUNCTION ERROR ===');
    console.error('Error details:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
