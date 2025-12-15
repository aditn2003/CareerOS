export function Field({label,type="text",id,...props}){
  const inputId = id || `field-${Math.random().toString(36).substr(2, 9)}`;
  return(
  <div className="field">
    <label htmlFor={inputId}>{label}</label>
    <input type={type} id={inputId} {...props} aria-label={label}/>
  </div>);
}
export function TextArea({label,id,...props}){
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
  return(
  <div className="field">
    <label htmlFor={textareaId}>{label}</label>
    <textarea id={textareaId} {...props} aria-label={label}></textarea>
  </div>);
}

