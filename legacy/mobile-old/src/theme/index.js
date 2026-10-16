export const colors = {
  blue:         '#1A6FE8',
  blueLight:    '#EBF2FD',
  blueMid:      '#BFDBFE',
  blueDark:     '#1347A0',
  green:        '#059669',
  greenLight:   '#ECFDF5',
  greenMid:     '#A7F3D0',
  red:          '#DC2626',
  redLight:     '#FEF2F2',
  redMid:       '#FECACA',
  orange:       '#D97706',
  orangeLight:  '#FFFBEB',
  gold:         '#B45309',
  white:        '#FFFFFF',
  bg:           '#F8FAFC',
  bg2:          '#F1F5F9',
  border:       '#E2E8F0',
  border2:      '#CBD5E1',
  text:         '#0F172A',
  text2:        '#334155',
  text3:        '#64748B',
  text4:        '#94A3B8',
  dark:         '#0F172A',
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 5,
  },
};

export const card = {
  backgroundColor: colors.white,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.border,
  padding: 16,
  ...shadows.sm,
};
