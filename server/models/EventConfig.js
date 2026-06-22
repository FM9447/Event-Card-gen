import mongoose from 'mongoose';

const partnerSchema = new mongoose.Schema({
  id:   { type: String, required: true },
  name: { type: String, required: true },
  logo: { type: String, default: null }, // base64 or null
}, { _id: false });

const eventConfigSchema = new mongoose.Schema(
  {
    slug:            { type: String, required: true, unique: true, index: true },
    eventName:       { type: String, default: 'Poster Gen Event' },
    location:        { type: String, default: 'KOZHIKODE – IOCOD, Sahya Building, Govt. Cyber Park' },
    date:            { type: String, default: 'Sunday, June 21, 2026' },
    time:            { type: String, default: '10:30 AM' },
    headerLogo:      { type: String, default: null },
    headerLogoHeight: { type: Number, default: 40 },
    // Poster template uploaded via Cloudinary
    templateUrl:      { type: String, default: null },
    templatePublicId: { type: String, default: null },
    templateKeyword:  { type: String, default: 'Default' },
    templates: {
      type: [{
        keyword:          { type: String, required: true },
        templateUrl:      { type: String, required: true },
        templatePublicId: { type: String, required: true },
      }],
      default: []
    },
    // Page background image uploaded via Cloudinary
    backgroundImageUrl:      { type: String, default: null },
    backgroundImagePublicId: { type: String, default: null },
    // Event info banner image uploaded via Cloudinary
    bannerUrl:      { type: String, default: null },
    bannerPublicId: { type: String, default: null },
    // Photo placement options
    photoX:      { type: Number, default: 540 },
    photoY:      { type: Number, default: 470 },
    photoRadius: { type: Number, default: 200 },
    photoWidth:  { type: Number, default: 400 },
    photoHeight: { type: Number, default: 400 },
    photoShape:  { type: String, default: 'circle' },
    photoRotation: { type: Number, default: 0 },
    // Photo border options
    photoBorderEnabled: { type: Boolean, default: false },
    photoBorderWidth: { type: Number, default: 8 },
    photoBorderType: { type: String, default: 'solid' },
    photoBorderColor: { type: String, default: '#4285F4' },
    photoBorderGradientStart: { type: String, default: '#4285F4' },
    photoBorderGradientEnd: { type: String, default: '#34A853' },
    // Photo background options
    photoBackgroundEnabled: { type: Boolean, default: false },
    photoBackgroundType: { type: String, default: 'solid' },
    photoBackgroundColor: { type: String, default: '#E8F0FE' },
    photoBackgroundGradientStart: { type: String, default: '#4285F4' },
    photoBackgroundGradientEnd: { type: String, default: '#34A853' },
    // Theme options
    backgroundOpacity: { type: Number, default: 93 },
    themePrimary:      { type: String, default: '#4285F4' },
    themeSecondary:    { type: String, default: '#34A853' },
    themeDark:         { type: String, default: '#1A1A1A' },
    themeCardBg:       { type: String, default: '#FFFFFF' },
    themeCardOpacity:  { type: Number, default: 75 },
    themeHeaderBg:     { type: String, default: '#F8F9FA' },
    themeHeaderBgOpacity: { type: Number, default: 85 },
    themeHeaderText:   { type: String, default: '#1A1A1A' },
    // Access control
    adminEmail:        { type: String, default: '' },
    adminPassword:     { type: String, default: '' },
    allowedEmails:     { type: [String], default: [] },
    partners:   { type: [partnerSchema], default: () => ([
      { id: '1', name: 'Build with AI', logo: null },
      { id: '2', name: 'µLearn',        logo: null },
      { id: '3', name: 'IOCOD',         logo: null },
      { id: '4', name: 'CAFIT',         logo: null },
      { id: '5', name: 'GTECH Mulearn', logo: null },
      { id: '6', name: 'Cyberpark',     logo: null },
    ]) },
  },
  { timestamps: true }
);

// Scrub sensitive access credentials from JSON and object serializations before sending to the client
eventConfigSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.adminEmail;
    delete ret.adminPassword;
    return ret;
  }
});

eventConfigSchema.set('toObject', {
  transform: (doc, ret) => {
    delete ret.adminEmail;
    delete ret.adminPassword;
    return ret;
  }
});

export default mongoose.model('EventConfig', eventConfigSchema);
