"""
Meta-Learner for AlphaFlow
==========================
This module implements a meta-learning strategy to dynamically select the best
prediction model or create a weighted ensemble based on recent performance.
This helps the system adapt to changing market conditions.
"""

import numpy as np
import pandas as pd

class MetaLearner:
    def __init__(self, model_names, decay_factor=0.95):
        """
        Initializes the MetaLearner.
        
        :param model_names: A list of strings with the names of the models to track.
        :param decay_factor: A float between 0 and 1 for exponential decay of old errors.
        """
        self.model_names = model_names
        self.decay_factor = decay_factor
        
        # Initialize performance tracking
        self.errors = {model: [] for model in self.model_names}
        self.weights = {model: 1.0 / len(model_names) for model in self.model_names}

    def update_performance(self, predictions, actual_value):
        """
        Updates the performance of each model based on the latest prediction and actual value.
        
        :param predictions: A dictionary where keys are model names and values are their predictions.
        :param actual_value: The true value that was observed.
        """
        if not actual_value:
            return
            
        for model_name in self.model_names:
            if model_name in predictions:
                pred = predictions[model_name]
                # Using Mean Absolute Percentage Error (MAPE)
                error = np.abs((actual_value - pred) / actual_value) if actual_value != 0 else np.abs(actual_value - pred)
                
                # Add the new error to the list
                self.errors[model_name].append(error)

        self._update_weights()

    def _update_weights(self):
        """
        Recalculates the weights for each model based on their historical performance,
        giving more weight to models with lower recent error.
        """
        avg_errors = {}
        for model_name in self.model_names:
            if self.errors[model_name]:
                # Use exponential weighting for recent performance
                errors = np.array(self.errors[model_name])
                weights = np.array([self.decay_factor**i for i in range(len(errors), 0, -1)])
                weighted_avg_error = np.sum(errors * weights) / np.sum(weights)
                avg_errors[model_name] = weighted_avg_error
            else:
                avg_errors[model_name] = 1.0 # Default error if no history

        # Convert errors to inverse scores (lower error = higher score)
        total_inverse_error = sum(1.0 / (avg_errors.get(m, 1.0) + 1e-6) for m in self.model_names)
        
        if total_inverse_error == 0:
            # Reset to equal weights if all errors are somehow zero or invalid
            num_models = len(self.model_names)
            self.weights = {model: 1.0 / num_models for model in self.model_names}
            return

        for model_name in self.model_names:
            inverse_error = 1.0 / (avg_errors.get(model_name, 1.0) + 1e-6)
            self.weights[model_name] = inverse_error / total_inverse_error

    def get_best_model(self):
        """
        Returns the name of the model with the highest current weight.
        """
        if not self.weights:
            return None
        return max(self.weights, key=self.weights.get)

    def get_ensemble_prediction(self, predictions):
        """
        Calculates a weighted average prediction from all models.
        
        :param predictions: A dictionary of predictions from each model.
        :return: A single float value representing the ensembled prediction.
        """
        ensemble_prediction = 0.0
        total_weight = 0.0
        
        for model_name, pred in predictions.items():
            if model_name in self.weights:
                ensemble_prediction += pred * self.weights[model_name]
                total_weight += self.weights[model_name]
        
        return ensemble_prediction / total_weight if total_weight > 0 else np.mean(list(predictions.values()))

    def get_weights(self):
        """
        Returns the current weights of all models.
        """
        return self.weights

if __name__ == '__main__':
    # Example Usage
    models = ['XGBoost', 'RandomForest', 'LSTM']
    meta_learner = MetaLearner(model_names=models)

    # Simulate a few prediction cycles
    actuals = [100, 102, 101, 103, 105]
    preds_history = [
        {'XGBoost': 101, 'RandomForest': 99, 'LSTM': 100.5},
        {'XGBoost': 101.5, 'RandomForest': 102.5, 'LSTM': 102.1},
        {'XGBoost': 100, 'RandomForest': 101.5, 'LSTM': 101.2},
        {'XGBoost': 104, 'RandomForest': 102, 'LSTM': 103.5},
        {'XGBoost': 104.5, 'RandomForest': 105.5, 'LSTM': 105.1},
    ]

    for i, actual in enumerate(actuals):
        print(f"\n--- Cycle {i+1} ---")
        print(f"Actual Price: {actual}")
        
        current_preds = preds_history[i]
        print(f"Predictions: {current_preds}")
        
        # Before updating, get the ensemble prediction for this cycle
        ensemble_pred = meta_learner.get_ensemble_prediction(current_preds)
        print(f"Ensemble Prediction: {ensemble_pred:.2f}")
        
        # Update performance based on the actual value
        meta_learner.update_performance(current_preds, actual)
        
        # See the new weights
        print(f"Updated Weights: {meta_learner.get_weights()}")
        print(f"Best Model: {meta_learner.get_best_model()}")
