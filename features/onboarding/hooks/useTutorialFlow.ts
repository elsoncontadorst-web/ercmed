import { useState, useEffect } from 'react';
import {
    OnboardingStepId,
    OnboardingStepStatus,
    OnboardingState,
    INITIAL_STEPS,
    OnboardingStep
} from '../types';
import { auth, db } from '../../../services/firebase'; // Adjust path if needed
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const STORAGE_KEY = 'easymed_onboarding_local_state';

export const useTutorialFlow = () => {
    const [state, setState] = useState<OnboardingState>({
        currentStepId: INITIAL_STEPS[0].id,
        steps: INITIAL_STEPS,
        isCompleted: false,
        progressPercentage: 0
    });
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);

    // Load state from Firestore or initialize
    useEffect(() => {
        const loadState = async () => {
            if (!auth.currentUser) {
                setLoading(false);
                return;
            }

            try {
                const userRef = doc(db, 'users', auth.currentUser.uid);
                const onboardingRef = doc(userRef, 'onboarding', 'tutorial');
                const docSnap = await getDoc(onboardingRef);

                if (docSnap.exists()) {
                    const data = docSnap.data() as Partial<OnboardingState>;
                    // Merge with initial steps to ensure schema updates don't break
                    const mergedSteps = INITIAL_STEPS.map(initialStep => {
                        const savedStep = data.steps?.find(s => s.id === initialStep.id);
                        return savedStep ? { ...initialStep, ...savedStep } : initialStep;
                    });

                    const activeStep = mergedSteps.find(s => s.status === OnboardingStepStatus.ACTIVE) ||
                        mergedSteps.find(s => s.status === OnboardingStepStatus.LOCKED) ||
                        mergedSteps[mergedSteps.length - 1];

                    // Calculate progress
                    const completedCount = mergedSteps.filter(s =>
                        s.status === OnboardingStepStatus.COMPLETED || s.status === OnboardingStepStatus.SKIPPED
                    ).length;
                    const progress = Math.round((completedCount / mergedSteps.length) * 100);

                    setState({
                        currentStepId: activeStep?.id || OnboardingStepId.CONSULTORIOS,
                        steps: mergedSteps,
                        isCompleted: progress === 100,
                        progressPercentage: progress
                    });

                    // Should we open automatically? Only if not completed
                    if (progress < 100 && !localStorage.getItem('onboarding_closed_manually')) {
                        setIsOpen(true);
                    }

                } else {
                    // New user, initialize
                    setIsOpen(true);
                    // Optionally save initial state
                }
            } catch (error) {
                console.error("Error loading onboarding state:", error);
            } finally {
                setLoading(false);
            }
        };

        loadState();
    }, []);

    const saveState = async (newState: OnboardingState) => {
        if (!auth.currentUser) return;
        try {
            const userRef = doc(db, 'users', auth.currentUser.uid);
            const onboardingRef = doc(userRef, 'onboarding', 'tutorial');
            await setDoc(onboardingRef, newState, { merge: true });
        } catch (error) {
            console.error("Error saving onboarding state:", error);
        }
    };

    const completeStep = async (stepId: OnboardingStepId) => {
        setState(prev => {
            const stepIndex = prev.steps.findIndex(s => s.id === stepId);
            if (stepIndex === -1) return prev;

            const newSteps = [...prev.steps];

            // Mark current as completed
            newSteps[stepIndex] = {
                ...newSteps[stepIndex],
                status: OnboardingStepStatus.COMPLETED,
                completedAt: new Date().toISOString()
            };

            // Unlock next
            const nextIndex = stepIndex + 1;
            let nextStepId = prev.currentStepId;

            if (nextIndex < newSteps.length) {
                newSteps[nextIndex] = {
                    ...newSteps[nextIndex],
                    status: OnboardingStepStatus.ACTIVE
                };
                nextStepId = newSteps[nextIndex].id;
            }

            const completedCount = newSteps.filter(s => s.status === OnboardingStepStatus.COMPLETED || s.status === OnboardingStepStatus.SKIPPED).length;
            const progress = Math.round((completedCount / newSteps.length) * 100);
            const isCompleted = progress === 100;

            const newState = {
                currentStepId: nextStepId,
                steps: newSteps,
                isCompleted,
                progressPercentage: progress
            };

            saveState(newState);
            return newState;
        });
    };

    const skipStep = async (stepId: OnboardingStepId) => {
        setState(prev => {
            const stepIndex = prev.steps.findIndex(s => s.id === stepId);
            if (stepIndex === -1) return prev;

            // Can only skip if optional? Or allow all? Requirements say "pular etapas opcionais"
            if (!prev.steps[stepIndex].isOptional) {
                // For now, let's just log warning, or maybe return prev
                console.warn("Attempted to skip mandatory step");
                // Proceeding anyway for flexibility if desired, or strictly block:
                // return prev; 
            }

            const newSteps = [...prev.steps];

            newSteps[stepIndex] = {
                ...newSteps[stepIndex],
                status: OnboardingStepStatus.SKIPPED,
                completedAt: new Date().toISOString()
            };

            const nextIndex = stepIndex + 1;
            let nextStepId = prev.currentStepId;

            if (nextIndex < newSteps.length) {
                newSteps[nextIndex] = {
                    ...newSteps[nextIndex],
                    status: OnboardingStepStatus.ACTIVE
                };
                nextStepId = newSteps[nextIndex].id;
            }

            const completedCount = newSteps.filter(s => s.status === OnboardingStepStatus.COMPLETED || s.status === OnboardingStepStatus.SKIPPED).length;
            const progress = Math.round((completedCount / newSteps.length) * 100);
            const isCompleted = progress === 100;

            const newState = {
                currentStepId: nextStepId,
                steps: newSteps,
                isCompleted,
                progressPercentage: progress
            };

            saveState(newState);
            return newState;
        });
    };

    const toggleOpen = () => {
        setIsOpen(prev => {
            const newValue = !prev;
            if (!newValue) {
                localStorage.setItem('onboarding_closed_manually', 'true');
            } else {
                localStorage.removeItem('onboarding_closed_manually');
            }
            return newValue;
        });
    };

    return {
        ...state,
        loading,
        isOpen,
        completeStep,
        skipStep,
        toggleOpen
    };
};
