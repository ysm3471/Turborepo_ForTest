import React from 'react'
import styled from './Button.module.css'

interface props {
  num:number
  handleClick:() => void
}

export default function Button({num,handleClick}:props) {
  return (
    <button className={styled.button} onClick={handleClick}>  
      {num}
    </button> 
  )
}
