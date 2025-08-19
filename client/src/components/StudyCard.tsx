import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Favorite,
  FavoriteBorder,
  CheckCircle,
  Error,
  Info,
  Edit,
} from '@mui/icons-material';
import { Word, CheckAnswerResponse, UpdateWordRequest } from '../types';
import { wordsApi, answersApi } from '../services/api';

interface StudyCardProps {
  onWordCompleted: () => void;
  favoriteOnly?: boolean;
}

export const StudyCard: React.FC<StudyCardProps> = ({ 
  onWordCompleted, 
  favoriteOnly = false 
}) => {
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [shouldFocusInput, setShouldFocusInput] = useState(false);
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<CheckAnswerResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExampleRevealed, setIsExampleRevealed] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState<UpdateWordRequest>({
    english: '',
    russian: '',
    exampleEn: '',
    exampleRu: '',
  });
  const [enteredSynonyms, setEnteredSynonyms] = useState<string[]>([]);
  const autoAdvanceTimeoutRef = useRef<number | null>(null);

  const loadNextWord = async (excludeCurrent: boolean = false) => {
  try {
      setLoading(true);
      setError(null);
      const word = await wordsApi.getStudyWord(
        favoriteOnly,
        excludeCurrent && currentWord ? currentWord.id : undefined
      );
      setCurrentWord(word);
      setAnswer('');
      setResult(null);
  setIsExampleRevealed(false);
  setIsAnswerRevealed(false);
  setShouldFocusInput(true);
    } catch (err: unknown) {
      setError('Failed to load word');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shouldFocusInput) {
      setShouldFocusInput(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [shouldFocusInput, currentWord]);

  useEffect(() => {
    loadNextWord();
  }, [favoriteOnly]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWord || !answer.trim()) return;

    try {
      setLoading(true);
      const result = await answersApi.checkAnswer({
        wordId: currentWord.id,
        answer: answer.trim(),
      });
      setResult(result);
      if (result.isSynonym) {
        setEnteredSynonyms((prev) => [...prev, answer]);
        setAnswer('');
        setShouldFocusInput(true);
      }
      if (result.isCorrect) {
        setEnteredSynonyms([]);
        if (autoAdvanceTimeoutRef.current) {
          window.clearTimeout(autoAdvanceTimeoutRef.current);
          autoAdvanceTimeoutRef.current = null;
        }
        autoAdvanceTimeoutRef.current = window.setTimeout(() => {
          onWordCompleted();
          loadNextWord();
          autoAdvanceTimeoutRef.current = null;
        }, 2000);
      }
    } catch (err: unknown) {
      setError('Failed to check answer');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!currentWord) return;
    
    try {
      const updatedWord = await wordsApi.toggleFavorite(currentWord.id);
      setCurrentWord(updatedWord);
    } catch (err: unknown) {
      setError('Failed to toggle favorite');
    }
  };

  const handleEditOpen = () => {
    if (!currentWord) return;
    setFormData({
      english: currentWord.english,
      russian: currentWord.russian,
      exampleEn: currentWord.exampleEn,
      exampleRu: currentWord.exampleRu,
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!currentWord) return;

    try {
      await wordsApi.update(currentWord.id, formData);
      setEditDialogOpen(false);
      if (autoAdvanceTimeoutRef.current) {
        window.clearTimeout(autoAdvanceTimeoutRef.current);
        autoAdvanceTimeoutRef.current = null;
      }
      loadNextWord(true);
    } catch (err: unknown) {
      setError('Failed to save word');
    }
  };

  const handleRevealExample = () => {
    if (!isExampleRevealed) {
      setIsExampleRevealed(true);
    }
  };

  if (loading && !currentWord) {
    return (
      <Card sx={{ minWidth: 400, textAlign: 'center', p: 4 }}>
        <Typography>Loading...</Typography>
      </Card>
    );
  }

  if (error && !currentWord) {
    return (
      <Card sx={{ minWidth: 400, textAlign: 'center', p: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={() => loadNextWord()}>
          Try Again
        </Button>
      </Card>
    );
  }

  if (!currentWord) {
    return (
      <Card sx={{ minWidth: 400, textAlign: 'center', p: 4 }}>
        <Typography variant="h6" gutterBottom>
          No words available for study
        </Typography>
        <Typography color="text.secondary">
          {favoriteOnly 
            ? 'Add some words to favorites to study them' 
            : 'Add some words to start studying'
          }
        </Typography>
      </Card>
    );
  }

  return (
    <>
      <Card sx={{ minWidth: 400, maxWidth: 600 }}>
        <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5" component="div">
            {currentWord.russian}
          </Typography>
          <Box display="flex" alignItems="center">
            <Tooltip title={currentWord.isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
              <IconButton onClick={handleToggleFavorite} color="primary">
                {currentWord.isFavorite ? <Favorite /> : <FavoriteBorder />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit word">
              <IconButton onClick={handleEditOpen} color="primary">
                <Edit />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Box mb={3}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Example in Russian:
          </Typography>
          <Typography variant="body1" sx={{ fontStyle: 'italic' }}>
            {currentWord.exampleRu}
          </Typography>
        </Box>

        <Box mb={3}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Example in English:
          </Typography>
          <Box
            onClick={handleRevealExample}
            sx={{
              position: 'relative',
              cursor: isExampleRevealed ? 'default' : 'pointer',
              userSelect: isExampleRevealed ? 'text' : 'none',
            }}
          >
            <Typography
              variant="body1"
              sx={{
                fontStyle: 'italic',
                filter: isExampleRevealed ? 'none' : 'blur(6px)',
                transition: 'filter 0.2s ease',
              }}
            >
              {currentWord.exampleEn}
            </Typography>
            {!isExampleRevealed && (
              <Chip
                size="small"
                label="Click to reveal"
                color="primary"
                sx={{ position: 'absolute', top: -8, right: 0 }}
              />
            )}
          </Box>
        </Box>

  <form onSubmit={handleSubmit}>

          <TextField
            fullWidth
            label="Enter English word"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={loading || result?.isCorrect || isExampleRevealed || isAnswerRevealed}
            inputRef={inputRef}
            sx={{ mb: 2 }}
            autoComplete="off"
          />

          {isAnswerRevealed && (
            <Box mb={1}>
              <Alert icon={<CheckCircle />} severity="info">
                Correct answer: <strong>{currentWord.english}</strong>
              </Alert>
            </Box>
          )}

          {isExampleRevealed && (
            <Box mb={2}>
              <Alert icon={<Info />} severity="info">
                English example revealed. Input is locked. Click Next to continue.
              </Alert>
            </Box>
          )}

          {result && (
            <Box mb={2}>
              {result.isCorrect ? (
                <Alert icon={<CheckCircle />} severity="success">
                  Correct! Well done!
                </Alert>
              ) : result.isSynonym ? (
                <Alert icon={<Info />} severity="info">
                  This is synonym, try another word. Entered synonyms:<br></br>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {enteredSynonyms.map((syn, idx) => (
                      <li key={idx}><strong>{syn}</strong></li>
                    ))}
                  </ul>
                </Alert>
              ) : result.isPartial ? (
                <Alert icon={<Info />} severity="info">
                  {result.hint}
                </Alert>
              ) : (
                <Alert icon={<Error />} severity="error">
                  Incorrect. The correct answer is: <strong>{result.correctAnswer}</strong>
                </Alert>
              )}
            </Box>
          )}

          <Button
            variant="text"
            color="secondary"
            fullWidth
            sx={{ mt: 1, mb: 1 }}
            onClick={() => setIsAnswerRevealed(true)}
            disabled={isAnswerRevealed || Boolean(result && !result.isCorrect && !result.isPartial && !result.isSynonym)}
          >
            Show Answer
          </Button>

          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading || !answer.trim() || result?.isCorrect || isExampleRevealed || isAnswerRevealed || Boolean(result && !result.isCorrect && !result.isPartial && !result.isSynonym)}
          >
            {loading ? 'Checking...' : 'Check Answer'}
          </Button>
        </form>

        <Button
          variant="text"
          fullWidth
          sx={{ mt: 1 }}
          disabled={loading}
          onClick={() => {
            setEnteredSynonyms([]);
            if (autoAdvanceTimeoutRef.current) {
              window.clearTimeout(autoAdvanceTimeoutRef.current);
              autoAdvanceTimeoutRef.current = null;
            }
            if (result?.isCorrect) {
              onWordCompleted();
            }
            loadNextWord(true);
          }}
        >
          Next
        </Button>
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Word</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="English"
            value={formData.english}
            onChange={(e) => setFormData({ ...formData, english: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Russian"
            value={formData.russian}
            onChange={(e) => setFormData({ ...formData, russian: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Example (English)"
            value={formData.exampleEn}
            onChange={(e) => setFormData({ ...formData, exampleEn: e.target.value })}
            margin="normal"
            multiline
            rows={2}
          />
          <TextField
            fullWidth
            label="Example (Russian)"
            value={formData.exampleRu}
            onChange={(e) => setFormData({ ...formData, exampleRu: e.target.value })}
            margin="normal"
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
