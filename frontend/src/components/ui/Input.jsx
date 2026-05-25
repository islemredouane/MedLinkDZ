import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import './Input.css';

export default function Input({
  label,
  id,
  error,
  icon: Icon,
  className = '',
  type = 'text',
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;

  const togglePasswordVisibility = (e) => {
    e.preventDefault();
    setShowPassword((prev) => !prev);
  };

  return (
    <div className={`input-group ${error ? 'has-error' : ''} ${className}`}>
      {label && <label htmlFor={id} className="input-label">{label}</label>}
      
      <div className="input-wrapper">
        {Icon && <Icon className="input-icon" size={18} />}
        <input
          id={id}
          type={inputType}
          className={`input-field ${Icon ? 'with-icon' : ''} ${isPassword ? 'with-toggle' : ''}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            className="input-toggle-btn"
            onClick={togglePasswordVisibility}
            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      
      {error && <p className="input-error-msg">{error}</p>}
    </div>
  );
}

