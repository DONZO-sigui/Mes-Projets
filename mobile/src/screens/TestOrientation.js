import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { submitQuiz } from '../api/quiz';
import Loading from '../components/Loading';

// Questions statiques
const QUESTIONS = [
  {
    id: 1,
    text: "Quelles matières vous passionnent le plus au lycée ?",
    options: [
      { id: 'maths', label: "Mathématiques et Physique" },
      { id: 'bio', label: "Biologie et Chimie" },
      { id: 'lettres', label: "Littérature et Philosophie" },
      { id: 'eco', label: "Économie et Gestion" }
    ]
  },
  {
    id: 2,
    text: "Dans quel type d'environnement préférez-vous travailler ?",
    options: [
      { id: 'bureau', label: "Dans un bureau, sur ordinateur" },
      { id: 'terrain', label: "Sur le terrain, en extérieur" },
      { id: 'labo', label: "En laboratoire, pour la recherche" },
      { id: 'public', label: "En contact constant avec le public" }
    ]
  },
  {
    id: 3,
    text: "Quelle est votre principale qualité ?",
    options: [
      { id: 'logique', label: "Logique et rigueur" },
      { id: 'creativite', label: "Créativité et imagination" },
      { id: 'empathie', label: "Écoute et empathie" },
      { id: 'leadership', label: "Leadership et organisation" }
    ]
  }
];

const TestOrientation = ({ navigation }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);

  const handleSelectOption = (questionId, optionId) => {
    setAnswers({ ...answers, [questionId]: optionId });
  };

  const handleNext = () => {
    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const results = await submitQuiz(answers);
      navigation.navigate('ResultatsTest', { results });
    } catch (err) {
      Alert.alert("Erreur", "Impossible de soumettre le test.");
      console.error(err);
      setLoading(false);
    }
  };

  if (loading) return <Loading message="Analyse de vos réponses..." />;

  const question = QUESTIONS[currentStep];
  const progress = ((currentStep + 1) / QUESTIONS.length) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.progressText}>Question {currentStep + 1} sur {QUESTIONS.length}</Text>

      <ScrollView style={styles.content}>
        <Text style={styles.questionText}>{question.text}</Text>
        
        <View style={styles.optionsContainer}>
          {question.options.map(option => {
            const isSelected = answers[question.id] === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
                onPress={() => handleSelectOption(question.id, option.id)}
              >
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.navButton, currentStep === 0 && styles.navButtonDisabled]}
          onPress={handlePrev}
          disabled={currentStep === 0}
        >
          <Text style={[styles.navButtonText, currentStep === 0 && styles.navButtonTextDisabled]}>Précédent</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryButton, !answers[question.id] && styles.primaryButtonDisabled]}
          onPress={handleNext}
          disabled={!answers[question.id]}
        >
          <Text style={styles.primaryButtonText}>
            {currentStep === QUESTIONS.length - 1 ? 'Terminer' : 'Suivant'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#e2e8f0',
    width: '100%',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#0ea5e9',
  },
  progressText: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 12,
    marginTop: 10,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  questionText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 30,
    lineHeight: 32,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    padding: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  optionButtonSelected: {
    borderColor: '#0ea5e9',
    backgroundColor: '#f0f9ff',
  },
  optionText: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#0369a1',
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  navButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '600',
  },
  navButtonTextDisabled: {
    color: '#94a3b8',
  },
  primaryButton: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  primaryButtonDisabled: {
    backgroundColor: '#7dd3fc',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default TestOrientation;
