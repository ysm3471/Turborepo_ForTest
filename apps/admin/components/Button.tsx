import React from 'react'
import styled from './Button.module.css'

interface props {
  num:number
  handleClick:() => void
  seleted:number
}

export default function Button({seleted,num,handleClick}:props) {
  return (
    <button className={seleted === num ? `${styled.button} ${styled.seleted}` : `${styled.button}`} onClick={handleClick}>  
      {num}
    </button> 
  )
}
