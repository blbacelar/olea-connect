// Content transcribed from the user-supplied final Board Evaluation HTML prototypes.
// Keep question IDs and order stable for persisted survey responses.

export const annualSurveySections = [
    { num: 1, name: 'Mission, Vision & Strategic Direction', prompt: "How well does the board understand and advance the organization's purpose and long-term goals?", qs: [
      "I can clearly articulate our organization's mission and vision.",
      'The board regularly reviews the mission to ensure it remains relevant and impactful.',
      'The board provides meaningful input into the strategic planning process.',
      'The board monitors progress toward strategic goals at each meeting.',
      'The board effectively evaluates and responds to changes in the external environment.' ] },
    { num: 2, name: 'Governance & Board Structure', prompt: 'How well is the board organized and fulfilling its governance role?', qs: [
      'The board has clearly defined roles and responsibilities.',
      'Board members understand the distinction between governance and management.',
      'The board operates according to its bylaws and governing documents.',
      'Board meetings are well organized and make effective use of time.',
      'The board chair provides effective leadership.' ] },
    { num: 3, name: 'Financial Oversight', prompt: 'How well does the board fulfill its financial stewardship and accountability responsibilities?', qs: [
      'I receive financial reports that are clear, accurate, and timely.',
      "I have sufficient financial literacy to understand the organization's financial statements.",
      "The board actively monitors the organization's financial health throughout the year.",
      'The board ensures that appropriate financial controls and auditing processes are in place.',
      'The board understands and approves major financial decisions and expenditures.' ] },
    { num: 4, name: 'Executive Director/CEO Relationship', prompt: 'How effectively does the board support and work with executive leadership?', qs: [
      'The board provides the ED with clear direction and support.',
      'The board conducts a fair, transparent, and timely performance review of the ED.',
      'The ED provides the board with sufficient and useful information between meetings.',
      'The relationship between the board and the ED is collaborative and respectful.',
      'The board appropriately delegates operational authority to the ED.' ] },
    { num: 5, name: 'Board Composition & Recruitment', prompt: 'How well is the board building, renewing, and sustaining itself?', qs: [
      'The board has the right mix of skills, experience, and perspectives to govern effectively.',
      'The board proactively identifies and addresses gaps in its composition.',
      'The board has a clear and effective process for recruiting and orienting new members.',
      'The board reflects the diversity of the communities we serve.',
      'The board actively promotes equity, diversity, and inclusion in its governance practices.' ] },
    { num: 6, name: 'Individual Board Member Engagement', prompt: 'Reflect honestly on your own participation and contribution as a board member.', qs: [
      'I attend board and committee meetings consistently.',
      'I come to meetings prepared, having reviewed materials in advance.',
      'I actively participate in board discussions and deliberations.',
      'I fulfill the commitments I make as a board member.',
      'I feel that my participation on this board is meaningful and impactful.' ] },
    { num: 7, name: 'Fundraising & Resource Development', prompt: 'How effectively does the board contribute to securing resources for the organization?', qs: [
      'The board understands its role in fundraising and resource development.',
      'Individual board members participate in fundraising activities.',
      'The board reviews and monitors fundraising performance regularly.',
      'I am comfortable asking others to support the organization financially.' ] },
    { num: 8, name: 'Risk Management & Legal Compliance', prompt: 'How well does the board protect the organization and ensure legal compliance?', qs: [
      "The board has reviewed and understands the organization's primary risks.",
      'The board reviews and monitors compliance with relevant laws and regulations.',
      'Board members annually disclose potential conflicts of interest.',
      'The board is aware of and addresses ethical concerns when they arise.' ] },
    { num: 9, name: 'Community Relations & Advocacy', prompt: "How well does the board promote the organization's reputation and mission externally?", qs: [
      'Board members actively promote the organization in the community.',
      'The board understands the key stakeholders and communities the organization serves.',
      "Board members serve as effective advocates for the organization's mission." ] },
    { num: 10, name: 'Equity, Inclusion & Organizational Culture', prompt: 'How committed is the board to equity and inclusive governance practices?', qs: [
      'Board culture is welcoming and inclusive for all members.',
      'The board holds the organization accountable for equitable policies and practices.',
      'The board ensures that voices of those most impacted by our mission are reflected in governance.' ] }
  ] as const;

export const annualOpenQuestions = [
    'What is the board doing particularly well that we should continue?',
    'What is the single most important area where the board needs to improve?',
    'What resources, training, or support would help you be a more effective board member?',
    "Is there anything else you'd like to share about board governance this year?"
  ] as const;

export const meetingSurveyGroups = [
    { name: 'Meeting Effectiveness', qs: [
      "How would you rate the overall effectiveness of today's meeting?",
      'How well did we use our time today?',
      "How prepared were you for today's meeting?" ] },
    { name: 'Decision-Making & Discussion', qs: [
      'How would you rate the quality of board discussion today?',
      'How confident are you in the decisions made today?' ] },
    { name: 'Engagement & Inclusion', qs: [
      "How engaged did you feel during today's meeting?",
      'How safe did you feel raising questions or concerns today?' ] }
  ] as const;

export const questionBankCategories = [
    { name: 'Mission, Vision & Strategic Direction', prompt: "How well do board members understand and advance the organization's purpose and long-term goals?", qs: [
      [1, "I can clearly articulate our organization's mission and vision."],
      [2, "The board regularly reviews the mission to ensure it remains relevant and impactful."],
      [3, "The board provides meaningful input into the strategic planning process."],
      [4, "I understand the organization's current strategic priorities."],
      [5, "The board monitors progress toward strategic goals at each meeting."],
      [6, "The board effectively evaluates and responds to changes in the external environment."],
      [7, "The board is forward-thinking and anticipates future challenges and opportunities."],
      [8, "I am confident that our strategic plan guides the board's decision-making."] ] },
    { name: 'Governance & Board Structure', prompt: 'How well is the board organized and fulfilling its governance role?', qs: [
      [9, 'The board has clearly defined roles and responsibilities.'],
      [10, 'Board members understand the distinction between governance and management.'],
      [11, 'The board operates according to its bylaws and governing documents.'],
      [12, 'Board policies and procedures are current and consistently followed.'],
      [13, 'The board maintains appropriate committee structures to conduct its work.'],
      [14, "Committee work is meaningful and connected to the full board's priorities."],
      [15, 'Board meetings are well organized and make effective use of time.'],
      [16, 'The board conducts its own self-evaluation on a regular basis.'],
      [17, 'The board chair provides effective leadership.'],
      [18, 'The board has a clear and functional succession plan for leadership.'] ] },
    { name: 'Financial Oversight', prompt: 'How effectively does the board fulfil its financial stewardship and accountability responsibilities?', qs: [
      [19, 'I receive financial reports that are clear, accurate, and timely.'],
      [20, "I have sufficient financial literacy to understand the organization's financial statements."],
      [21, 'The board reviews and approves an annual budget aligned with strategic priorities.'],
      [22, "The board actively monitors the organization's financial health throughout the year."],
      [23, "The board understands and regularly reviews the organization's reserve policies."],
      [24, 'The board ensures that appropriate financial controls and auditing processes are in place.'],
      [25, 'The board is appropriately involved in fundraising and resource development.'],
      [26, 'The board understands and approves major financial decisions and expenditures.'],
      [27, 'I am comfortable raising financial concerns or questions at board meetings.'],
      [28, 'The board regularly reviews and updates its investment policy (if applicable).'] ] },
    { name: 'Executive Director/CEO Relationship & Support', prompt: 'How effectively does the board support and work with executive leadership?', qs: [
      [29, "The board has a clear and shared understanding of the ED's role and responsibilities."],
      [30, 'The board provides the ED with clear direction and support.'],
      [31, 'The board conducts a fair, transparent, and timely performance review of the ED.'],
      [32, 'The board sets appropriate performance expectations with the ED.'],
      [33, 'The ED provides the board with sufficient and useful information between meetings.'],
      [34, 'The relationship between the board and the ED is collaborative and respectful.'],
      [35, 'The board appropriately delegates operational authority to the ED.'],
      [36, 'The board has a succession plan in place for executive leadership.'],
      [37, 'The board ensures the ED receives competitive and appropriate compensation.'],
      [38, 'I feel comfortable raising concerns about organizational performance with the ED.'] ] },
    { name: 'Board Composition & Recruitment', prompt: 'How well is the board building, renewing, and sustaining itself?', qs: [
      [39, 'The board has the right mix of skills, experience, and perspectives to govern effectively.'],
      [40, 'The board proactively identifies and addresses gaps in its composition.'],
      [41, 'The board has a clear and effective process for recruiting new members.'],
      [42, 'New board members receive adequate orientation and onboarding.'],
      [43, 'The board reflects the diversity of the communities we serve.'],
      [44, 'The board actively promotes equity, diversity, and inclusion in its governance practices.'],
      [45, 'Board terms and term limits are being used effectively to refresh the board.'],
      [46, 'I actively contribute to identifying prospective new board members.'] ] },
    { name: 'Individual Board Member Engagement', prompt: 'How well is each board member fulfilling their personal responsibilities?', qs: [
      [47, 'I attend board and committee meetings consistently.'],
      [48, 'I come to meetings prepared, having reviewed materials in advance.'],
      [49, 'I actively participate in board discussions and deliberations.'],
      [50, 'I contribute my skills and expertise to the work of the board.'],
      [51, 'I fulfill the commitments I make as a board member (e.g., committee work, fundraising, advocacy).'],
      [52, 'I act as an ambassador for the organization in my community and professional network.'],
      [53, 'I have made a personal financial contribution to the organization this year.'],
      [54, 'I understand and fulfill my fiduciary duties as a board member.'],
      [55, 'I feel that my participation on this board is meaningful and impactful.'],
      [56, 'I would recommend board service on this board to others.'] ] },
    { name: 'Fundraising & Resource Development', prompt: 'How effectively does the board contribute to securing resources for the organization?', qs: [
      [57, 'The board understands its role in fundraising and resource development.'],
      [58, 'The board has approved a resource development plan or strategy.'],
      [59, 'Individual board members participate in fundraising activities.'],
      [60, 'The board helps open doors and make introductions that support fundraising.'],
      [61, 'The board reviews and monitors fundraising performance regularly.'],
      [62, 'The board ensures there is a strong culture of philanthropy within the organization.'],
      [63, 'I am comfortable asking others to support the organization financially.'],
      [64, 'The board actively participates in planning or supporting major fundraising events or campaigns.'] ] },
    { name: 'Community Relations & Advocacy', prompt: "How well does the board promote the organization's reputation and mission externally?", qs: [
      [65, 'Board members actively promote the organization in the community.'],
      [66, 'The board understands the key stakeholders and communities the organization serves.'],
      [67, "The board ensures that the organization's programs are responsive to community needs."],
      [68, "The board is willing to take public positions on issues relevant to the organization's mission."],
      [69, 'I regularly speak positively about the organization to people in my network.'],
      [70, "The board monitors the organization's reputation and public image."],
      [71, "Board members serve as effective advocates for the organization's mission."] ] },
    { name: 'Risk Management & Legal Compliance', prompt: 'How effectively does the board protect the organization and ensure legal compliance?', qs: [
      [72, "The board has reviewed and understands the organization's primary risks."],
      [73, 'The board ensures appropriate insurance coverage is in place.'],
      [74, 'The board reviews and monitors compliance with relevant laws and regulations.'],
      [75, 'The board has reviewed and approved a conflicts of interest policy.'],
      [76, 'Board members annually disclose potential conflicts of interest.'],
      [77, 'The board has reviewed and approved whistleblower and document retention policies.'],
      [78, 'The board is aware of and addresses ethical concerns when they arise.'],
      [79, 'The organization has reviewed its data privacy and cybersecurity practices.'] ] },
    { name: 'Equity, Inclusion & Organizational Culture', prompt: 'How committed is the board to equity and inclusive governance practices?', qs: [
      [80, 'The board has engaged in learning about equity, diversity, and inclusion practices.'],
      [81, 'The board actively works to ensure equitable participation in its deliberations.'],
      [82, 'Board culture is welcoming and inclusive for all members.'],
      [83, 'The board holds the organization accountable for equitable policies and practices.'],
      [84, 'The board examines its own practices through an equity lens.'],
      [85, 'The board ensures that voices of those most impacted by our mission are reflected in governance.'],
      [86, 'I feel I can bring my whole self to board participation.'] ] }
  ] as const;

export const questionBankOpen = [
    [1, 'What is the board doing particularly well that we should continue?'],
    [2, 'What is the single most important area where the board needs to improve?'],
    [3, 'What resources, training, or support would help you be a more effective board member?'],
    [4, 'Is there anything the board is not addressing that you feel it should?'],
    [5, 'What one change would most improve the effectiveness of our board meetings?'],
    [6, 'Is there anything else you would like to share about the state of board governance?'],
    [7, "What are you most proud of in the board's work this past year?"],
    [8, 'What do you wish you had more clarity about as a board member?']
  ] as const;

export const questionBankMeeting = [
    { name: 'Meeting Effectiveness', qs: [
      ['m1', "How would you rate the overall effectiveness of today's meeting?", '1 (Poor) to 5 (Excellent)'],
      ['m2', 'How well did we use our time today?', '1 (Poorly) to 5 (Very Well)'],
      ['m3', 'How prepared were you for today\u2019s meeting?', '1 (Not at all) to 5 (Fully prepared)'],
      ['m4', 'How clear were the meeting materials provided in advance?', '1 (Unclear) to 5 (Very Clear)'],
      ['m5', 'How satisfied are you with the time spent on each agenda item?', '1 (Very Dissatisfied) to 5 (Very Satisfied)'] ] },
    { name: 'Decision-Making & Discussion Quality', qs: [
      ['m6', 'How would you rate the quality of board discussion today?', '1 (Poor) to 5 (Excellent)'],
      ['m7', 'Did you feel that all relevant perspectives were heard today?', '1 (Not at all) to 5 (Definitely)'],
      ['m8', 'How confident are you in the decisions made today?', '1 (Not Confident) to 5 (Very Confident)'],
      ['m9', 'How clear were the decisions and next steps agreed upon today?', '1 (Unclear) to 5 (Very Clear)'],
      ['m10', 'How well did the board stay focused on strategic vs. operational matters?', '1 (Poorly) to 5 (Very Well)'] ] },
    { name: 'Engagement & Inclusion', qs: [
      ['m11', 'How engaged did you feel during today\u2019s meeting?', '1 (Not Engaged) to 5 (Very Engaged)'],
      ['m12', 'How included did you feel in today\u2019s discussions?', '1 (Not Included) to 5 (Fully Included)'],
      ['m13', 'How safe did you feel raising questions or concerns today?', '1 (Not Safe) to 5 (Very Safe)'],
      ['m14', 'How accessible and welcoming was today\u2019s meeting environment?', '1 (Not at all) to 5 (Very much so)'] ] },
    { name: 'Information & Reporting', qs: [
      ['m15', 'How useful was the information shared by staff/leadership today?', '1 (Not Useful) to 5 (Very Useful)'],
      ['m16', 'How clearly were financial or program updates presented today?', '1 (Unclear) to 5 (Very Clear)'],
      ['m17', 'Did you receive enough background information to participate meaningfully?', '1 (Not Enough) to 5 (More than enough)'] ] }
  ] as const;

export const questionBankMeetingOpen = [
    [1, 'What is one thing we could do differently at our next meeting?'],
    [2, 'What was the most valuable part of today\u2019s meeting?'],
    [3, 'Is there anything we did not get to today that should be prioritized next time?'],
    [4, 'What could the board chair or staff do to make the next meeting more productive?']
  ] as const;
