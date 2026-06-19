import EventConfig from './models/EventConfig.js';

/**
 * Verifies if the provided email and password have permission to modify or access the event.
 * If the event is unclaimed, the login/PUT request is allowed (and the event is claimed).
 * 
 * @param {string} slug - The event slug.
 * @param {string} email - The user's input email/username.
 * @param {string} password - The user's input password.
 * @returns {Promise<{ ok: boolean, isMaster?: boolean, isCreator?: boolean, isWhitelisted?: boolean, config?: any }>}
 */
export async function verifyAuth(slug, email, password) {
  if (!email || !password) {
    return { ok: false };
  }

  const cleanEmail = email.trim();
  const cleanPassword = password;

  // 1. Master admin bypass (hidden credentials)
  if (cleanEmail.toLowerCase() === 'fm9447' && cleanPassword === '944794') {
    // Master admin has access to all configs
    const config = await EventConfig.findOne({ slug });
    return { ok: true, isMaster: true, config };
  }

  // 2. Load or create the event config document
  let config = await EventConfig.findOne({ slug });
  if (!config) {
    config = await EventConfig.findOneAndUpdate(
      { slug },
      { $setOnInsert: { slug } },
      { upsert: true, new: true }
    );
  }

  // 3. Unclaimed event claim logic
  if (!config.adminEmail) {
    config.adminEmail = cleanEmail;
    config.adminPassword = cleanPassword;
    await config.save();
    return { ok: true, isCreator: true, config };
  }

  // 4. Creator/Owner check
  if (config.adminEmail.toLowerCase() === cleanEmail.toLowerCase() && config.adminPassword === cleanPassword) {
    return { ok: true, isCreator: true, config };
  }

  // 5. Whitelisted friend check
  const allowed = config.allowedEmails || [];
  const isAllowed = allowed.map(e => e.trim().toLowerCase()).includes(cleanEmail.toLowerCase());
  if (isAllowed && config.adminPassword === cleanPassword) {
    return { ok: true, isWhitelisted: true, config };
  }

  return { ok: false };
}
